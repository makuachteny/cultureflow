/**
 * Stripe webhook → shared finaliser.
 *
 * Verifies the Stripe-Signature header (inside the provider's
 * `parseWebhook`), normalises the event, and hands it to
 * `finaliseProviderEvent` which handles idempotency, status transitions,
 * and ticket issuance. We always respond 200 once we've either processed
 * or deduped — Stripe retries non-2xx aggressively.
 */

import { NextResponse } from "next/server";
import { stripeProvider } from "@/lib/payments/stripe";
import { finaliseProviderEvent } from "@/lib/payments/finalise";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const evt = stripeProvider.parseWebhook(raw, headers);
  if (!evt) {
    log.warn("stripe webhook: parse failed or event ignored");
    return NextResponse.json({ ok: true, ignored: true });
  }
  try {
    await finaliseProviderEvent("STRIPE", evt);
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("stripe webhook: finalise failed", {
      error:           (e as Error).message,
      providerEventId: evt.providerEventId
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
