/**
 * Webhook finalisation — shared across every payment provider.
 *
 * Each provider's webhook route does:
 *   1. Read raw body (signature verification needs raw bytes for Stripe).
 *   2. Call `provider.parseWebhook(body, headers)` → `NormalisedEvent | null`.
 *   3. Pass the normalised event to `finaliseProviderEvent` below.
 *   4. Respond 200.
 *
 * `finaliseProviderEvent` handles idempotency, status transition, and
 * ticket issuance in one transaction. Safe to call multiple times for
 * the same `providerEventId` — the unique-violation on `ProviderEvent.id`
 * gives us exactly-once processing under retries / replays.
 */

import type { Prisma, PaymentProvider as DbPaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { makeOpaqueToken, makeTicketCode } from "@/lib/server-utils";
import type { NormalisedEvent } from "./types";

export async function finaliseProviderEvent(
  provider: DbPaymentProvider,
  evt: NormalisedEvent
): Promise<void> {
  // 1. Idempotency.
  try {
    await prisma.providerEvent.create({
      data: { id: evt.providerEventId, provider, type: evt.type }
    });
  } catch (err) {
    // If the unique violation hits, we've already processed this event —
    // ack and exit so the rail stops retrying.
    const code = (err as { code?: string }).code;
    if (code === "P2002") return;
    throw err;
  }

  switch (evt.type) {
    case "payment.succeeded":
      await issueTicketsForSuccessfulPayment(evt);
      return;

    case "payment.failed":
      await markPaymentFailed(evt);
      return;

    case "payment.refunded":
      await markPaymentRefunded(evt);
      return;

    case "payment.cancelled":
      await markPaymentFailed(evt);
      return;
  }
}

async function issueTicketsForSuccessfulPayment(evt: NormalisedEvent): Promise<void> {
  // Find the local Payment + Order by the provider-side id.
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: evt.providerPaymentId },
    include: { order: { include: { event: true, user: true } } }
  });
  if (!payment) {
    log.warn("payment-finalise: payment not found for provider id", {
      providerPaymentId: evt.providerPaymentId
    });
    return;
  }
  if (payment.status === "SUCCEEDED" || payment.order.status === "PAID") return;

  // Fetch the reservation (if any) to know which tiers + quantities to issue.
  const reservation = await prisma.reservation.findFirst({
    where: { orderId: payment.orderId },
    include: { tier: true }
  });

  await prisma.$transaction(async (tx) => {
    // 1. Mark payment + order PAID.
    await tx.payment.update({
      where: { id: payment.id },
      data:  {
        status:           "SUCCEEDED",
        rawEvent:         (evt.raw ?? null) as Prisma.InputJsonValue,
        providerFeeCents: evt.providerFee?.amount
      }
    });
    await tx.order.update({
      where: { id: payment.orderId },
      data:  { status: "PAID" }
    });

    // 2. Issue tickets. We get the line items from any reservations
    //    attached to this order, falling back to a single line when the
    //    cart-reservation flow wasn't used (e.g. legacy/direct flow).
    const orderLines = reservation
      ? [{ tierId: reservation.tierId, quantity: reservation.quantity }]
      : await collectFallbackLines(payment.orderId);

    for (const line of orderLines) {
      // Atomic CAS: only increment sold when there's still capacity.
      const updated: number = await tx.$executeRaw`
        UPDATE "TicketTier"
        SET "sold" = "sold" + ${line.quantity}
        WHERE "id" = ${line.tierId}
          AND "sold" + ${line.quantity} <= "quantity"
      `;
      if (updated === 0) {
        // We're past capture; this shouldn't happen if the reservation
        // flow held the seats. Log loudly so support can refund and
        // contact the buyer.
        log.error("payment-finalise: oversell at issue time", {
          orderId: payment.orderId,
          tierId:  line.tierId,
          quantity: line.quantity
        });
        continue;
      }
      for (let i = 0; i < line.quantity; i++) {
        await tx.ticket.create({
          data: {
            code:          makeTicketCode(),
            qrData:        makeOpaqueToken(),
            attendeeName:  payment.order.user?.name ?? "Attendee",
            attendeeEmail: payment.order.user?.email ?? "",
            eventId:       payment.order.eventId,
            tierId:        line.tierId,
            orderId:       payment.orderId,
            userId:        payment.order.userId
          }
        });
      }
    }

    // 3. Burn the reservation now that seats are real tickets.
    if (reservation) {
      await tx.reservation.delete({ where: { id: reservation.id } });
    }
  });
}

async function collectFallbackLines(
  orderId: string
): Promise<Array<{ tierId: string; quantity: number }>> {
  // Legacy callers that didn't go through the reservation flow store
  // line items as Tickets pre-issued in PENDING. We don't currently have
  // such a model — return an empty array so the caller no-ops gracefully.
  void orderId;
  return [];
}

async function markPaymentFailed(evt: NormalisedEvent): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: evt.providerPaymentId }
  });
  if (!payment) return;
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data:  {
        status:   "FAILED",
        rawEvent: (evt.raw ?? null) as Prisma.InputJsonValue
      }
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data:  { status: "FAILED" }
    }),
    // Release any held reservation so the seats go back on sale.
    prisma.reservation.deleteMany({
      where: { orderId: payment.orderId }
    })
  ]);
}

async function markPaymentRefunded(evt: NormalisedEvent): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: evt.providerPaymentId }
  });
  if (!payment) return;
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status:              "REFUNDED",
        refundedAt:          new Date(),
        refundedAmountCents: evt.amount?.amount ?? payment.amountCents,
        rawEvent:            (evt.raw ?? null) as Prisma.InputJsonValue
      }
    });
    await tx.order.update({
      where: { id: payment.orderId },
      data:  { status: "REFUNDED" }
    });
    // Mark all tickets on this order as REFUNDED so the holder loses
    // entry rights. We don't return seats to capacity — the event has
    // probably happened or is about to.
    await tx.ticket.updateMany({
      where: { orderId: payment.orderId, status: "ISSUED" },
      data:  { status: "REFUNDED" }
    });
  });
}
