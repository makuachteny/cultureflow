/**
 * Reservation helpers — the TTL cart that holds seats while the buyer
 * is in the payment flow.
 *
 * Two ground rules:
 *   1. `availability(tier) = quantity - sold - SUM(active reservations)`.
 *      Use `availabilityFor` instead of reading `tier.quantity - tier.sold`
 *      directly anywhere a buyer might see "5 left" — it lies otherwise.
 *   2. Reservations are best-effort, not a contract. Sweep expired rows
 *      before each new reservation so we don't lock seats on dead carts.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** How long we hold seats once a buyer initiates checkout. Tunable per
 *  market — Stripe Checkout typically completes in <2 min, mobile-money
 *  STK pushes can need 90 s for the buyer to enter their PIN. */
export const RESERVATION_TTL_SECONDS = 12 * 60;

export interface AvailabilityRow {
  tierId:     string;
  quantity:   number;
  sold:       number;
  reserved:   number;
  available:  number;
}

/** Compute current availability for one tier, accounting for live
 *  (non-expired) reservations. */
export async function availabilityFor(tierId: string): Promise<AvailabilityRow> {
  const tier = await prisma.ticketTier.findUniqueOrThrow({
    where:  { id: tierId },
    select: { id: true, quantity: true, sold: true }
  });
  const reserved = await sumActiveReservations(tierId);
  return {
    tierId:    tier.id,
    quantity:  tier.quantity,
    sold:      tier.sold,
    reserved,
    available: Math.max(0, tier.quantity - tier.sold - reserved)
  };
}

async function sumActiveReservations(
  tierId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx ?? prisma;
  const agg = await client.reservation.aggregate({
    where: { tierId, expiresAt: { gt: new Date() } },
    _sum:  { quantity: true }
  });
  return agg._sum.quantity ?? 0;
}

/** Best-effort sweep — delete every expired reservation. Cheap and
 *  idempotent; we can call it from any hot path. */
export async function sweepExpiredReservations(): Promise<number> {
  const res = await prisma.reservation.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });
  return res.count;
}

/** Atomically place reservations for a multi-line cart. Throws if any
 *  line can't be satisfied — the whole transaction rolls back, leaving
 *  the cart empty and the seats free. */
export async function reserveSeats(opts: {
  userId: string;
  lines:  Array<{ tierId: string; quantity: number }>;
  ttlSeconds?: number;
}): Promise<{ reservationIds: string[]; expiresAt: Date }> {
  await sweepExpiredReservations();
  const expiresAt = new Date(Date.now() + (opts.ttlSeconds ?? RESERVATION_TTL_SECONDS) * 1000);

  return prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const line of opts.lines) {
      const tier = await tx.ticketTier.findUnique({
        where:  { id: line.tierId },
        select: { id: true, name: true, quantity: true, sold: true }
      });
      if (!tier) throw new Error("Tier not found");

      const reserved = await sumActiveReservations(tier.id, tx);
      const free     = tier.quantity - tier.sold - reserved;
      if (line.quantity > free) {
        throw new Error(`Only ${Math.max(0, free)} left for ${tier.name}.`);
      }

      const reservation = await tx.reservation.create({
        data: {
          tierId:    tier.id,
          userId:    opts.userId,
          quantity:  line.quantity,
          expiresAt
        }
      });
      ids.push(reservation.id);
    }
    return { reservationIds: ids, expiresAt };
  });
}

/** Attach an existing set of reservations to a freshly-created order. */
export async function bindReservationsToOrder(
  reservationIds: string[],
  orderId: string
): Promise<void> {
  await prisma.reservation.updateMany({
    where: { id: { in: reservationIds } },
    data:  { orderId }
  });
}

/** Release seats — used when the buyer abandons checkout, the rail
 *  reports failure, or we explicitly cancel. */
export async function releaseReservations(reservationIds: string[]): Promise<void> {
  await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
}
