/**
 * GET /api/checkout/status?orderId=…
 *
 * Polled by the buyer's browser after a mobile-money push (M-Pesa STK,
 * MoMo Request-to-Pay, m-Gurush prompt) so the UI can flip to "you're in"
 * the moment the rail's webhook fires.
 *
 * Returns one of:
 *   { status: "PENDING"|"PAID"|"FAILED", orderId, ... }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { hit, clientIp } from "@/lib/rate-limit";

// Polled by the buyer's browser every ~2.5s for up to 3 minutes — that's
// ~80 hits per session. 240 / minute / IP gives plenty of headroom for
// multiple tabs without enabling a useful DoS.
const STATUS_LIMIT     = 240;
const STATUS_WINDOW_MS = 60_000;

export async function GET(req: Request) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`checkout-status:${clientIp(req)}`, STATUS_LIMIT, STATUS_WINDOW_MS);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Polling too fast." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: {
      id: true, status: true, userId: true, totalCents: true, currency: true,
      payment: { select: { status: true, provider: true } }
    }
  });
  if (!order || order.userId !== gate.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    orderId:  order.id,
    status:   order.status,
    payment:  order.payment,
    redirect: order.status === "PAID" ? `/tickets?orderId=${order.id}` : null
  });
}
