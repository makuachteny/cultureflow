/**
 * MTN MoMo Collections callback. Set this URL as the `X-Callback-Url`
 * passed on each Request-to-Pay (we already do that in the provider's
 * `charge()`).
 *
 * MoMo also doesn't sign payloads, so we use the same shared-secret
 * URL token defence as M-Pesa: when MOMO_CALLBACK_TOKEN is set we
 * require it to be present in the URL.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { momoProvider } from "@/lib/payments/momo";
import { finaliseProviderEvent } from "@/lib/payments/finalise";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const expected = process.env.MOMO_CALLBACK_TOKEN;
  if (expected) {
    const got = new URL(req.url).searchParams.get("t") ?? "";
    if (
      Buffer.from(got).length !== Buffer.from(expected).length ||
      !timingSafeEqual(Buffer.from(got), Buffer.from(expected))
    ) {
      log.warn("momo webhook: bad callback token");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const raw = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const evt = momoProvider.parseWebhook(raw, headers);
  if (!evt) {
    log.warn("momo webhook: parse failed or event ignored", {
      preview: raw.slice(0, 200)
    });
    return NextResponse.json({ ok: true, ignored: true });
  }
  try {
    await finaliseProviderEvent("MOMO", evt);
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("momo webhook: finalise failed", {
      error:           (e as Error).message,
      providerEventId: evt.providerEventId
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
