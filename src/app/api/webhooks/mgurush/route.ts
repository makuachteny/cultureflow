/**
 * m-Gurush callback. The provider verifies an HMAC against
 * MGURUSH_WEBHOOK_SECRET inside `parseWebhook`, so a forged payload
 * returns null + we reject silently.
 */

import { NextResponse } from "next/server";
import { mgurushProvider } from "@/lib/payments/mgurush";
import { finaliseProviderEvent } from "@/lib/payments/finalise";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const evt = mgurushProvider.parseWebhook(raw, headers);
  if (!evt) {
    log.warn("mgurush webhook: parse failed or signature invalid");
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    await finaliseProviderEvent("MGURUSH", evt);
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("mgurush webhook: finalise failed", {
      error:           (e as Error).message,
      providerEventId: evt.providerEventId
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
