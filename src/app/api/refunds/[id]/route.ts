/**
 * POST /api/refunds/{id}
 *
 * Organizer (or admin) resolves a pending RefundRequest. On APPROVE we:
 *   1. Look up the underlying Order's Payment.
 *   2. Call `provider.refund()` against the live rail (Stripe always; the
 *      mobile-money rails throw an explicit "do it manually" error today).
 *   3. Mark the RefundRequest APPROVED.
 *   4. The Payment / Ticket flip happens via the rail's webhook, OR
 *      synchronously here as a fallback (mobile-money rails that lack
 *      webhook-on-refund need this).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { getProvider } from "@/lib/payments";
import { money, type Currency } from "@/lib/money";
import { log } from "@/lib/logger";
import { hit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  /** Required when REJECTED — the attendee sees this. */
  note:     z.string().trim().max(2000).optional()
});

// 60 resolutions / hour / IP — abuse ceiling. Organizers reviewing a
// queue rarely cross this; a script trying to brute-force IDs will.
const REFUND_LIMIT     = 60;
const REFUND_WINDOW_MS = 60 * 60_000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`refund-resolve:${clientIp(req)}`, REFUND_LIMIT, REFUND_WINDOW_MS);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many refund actions. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const refund = await prisma.refundRequest.findUnique({
    where: { id: params.id },
    include: {
      ticket: { include: { event: true, order: { include: { payment: true } } } }
    }
  });
  if (!refund) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (refund.status !== "PENDING") {
    return NextResponse.json(
      { error: `Already ${refund.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  // Authorisation: organizer of the event, or admin.
  const isOrganizer = refund.ticket.event.organizerId === gate.userId;
  if (!isOrganizer && gate.role !== "ADMIN") {
    return NextResponse.json({ error: "Not your event." }, { status: 403 });
  }

  if (parsed.data.decision === "REJECTED") {
    await prisma.refundRequest.update({
      where: { id: refund.id },
      data:  {
        status:       "REJECTED",
        resolvedAt:   new Date(),
        resolverId:   gate.userId,
        decisionNote: parsed.data.note
      }
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  /* ── APPROVED: trigger rail-side refund ── */
  const payment = refund.ticket.order.payment;
  if (!payment) {
    return NextResponse.json(
      { error: "No payment record — flip the ticket manually." },
      { status: 400 }
    );
  }

  const provider = getProvider(payment.provider);
  let providerRefundOk = false;
  try {
    if (payment.providerPaymentId) {
      // Refund only the price of THIS ticket (partial refund), not the
      // whole order. This lets multi-seat orders be partially refunded
      // when only one attendee asks.
      const tier = await prisma.ticketTier.findUnique({
        where: { id: refund.ticket.tierId }
      });
      const refundAmount = tier
        ? money(tier.priceCents, payment.currency as Currency)
        : undefined;
      await provider.refund({
        paymentId:        payment.id,
        providerPaymentId: payment.providerPaymentId,
        amount:           refundAmount,
        reason:           parsed.data.note ?? "Approved by organizer"
      });
      providerRefundOk = true;
    }
  } catch (e) {
    log.warn("refund: provider.refund failed — flipping local state only", {
      error: (e as Error).message,
      paymentId: payment.id
    });
  }

  // Always flip local state regardless of provider success — orgnizers
  // sometimes refund the buyer off-platform (cash, M-Pesa portal manual
  // reversal) and just want the ticket marked REFUNDED so the holder
  // can't show up.
  await prisma.$transaction([
    prisma.refundRequest.update({
      where: { id: refund.id },
      data:  {
        status:       "APPROVED",
        resolvedAt:   new Date(),
        resolverId:   gate.userId,
        decisionNote: parsed.data.note
      }
    }),
    prisma.ticket.update({
      where: { id: refund.ticketId },
      data:  { status: "REFUNDED" }
    })
  ]);

  return NextResponse.json({
    ok: true,
    status: "APPROVED",
    railRefunded: providerRefundOk
  });
}
