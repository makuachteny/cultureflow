/**
 * Safaricom Daraja STK Push callback. Set this URL in your Daraja app
 * config as the `CallBackURL` for STK pushes (and pass it via env in
 * MPESA_CALLBACK_URL — the provider passes it on every STK request).
 *
 * Daraja doesn't sign payloads (they expect you to whitelist their IPs
 * + use HTTPS). To stop random callers from forging "payment.succeeded"
 * events, we require the callback URL to include `?t=${MPESA_CALLBACK_TOKEN}`
 * and validate it here. The token is opaque + ours alone — Safaricom
 * just echoes whatever URL we gave them.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { mpesaProvider } from "@/lib/payments/mpesa";
import { finaliseProviderEvent } from "@/lib/payments/finalise";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Optional shared-secret check. If MPESA_CALLBACK_TOKEN is set, the
  // request URL must include ?t=<that-token> or we reject 401.
  const expected = process.env.MPESA_CALLBACK_TOKEN;
  if (expected) {
    const url = new URL(req.url);
    const got = url.searchParams.get("t") ?? "";
    if (
      Buffer.from(got).length !== Buffer.from(expected).length ||
      !timingSafeEqual(Buffer.from(got), Buffer.from(expected))
    ) {
      log.warn("mpesa webhook: bad callback token");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const raw = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const evt = mpesaProvider.parseWebhook(raw, headers);
  if (!evt) {
    log.warn("mpesa webhook: parse failed or event ignored", {
      preview: raw.slice(0, 200)
    });
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  try {
    await finaliseProviderEvent("MPESA", evt);
  } catch (e) {
    log.error("mpesa webhook: finalise failed", {
      error:           (e as Error).message,
      providerEventId: evt.providerEventId
    });
    // Daraja expects a JSON ack regardless — return 0/Accepted so they
    // stop retrying. Anything else triggers their retry loop.
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
