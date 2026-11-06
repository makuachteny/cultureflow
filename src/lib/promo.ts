/**
 * Promo-code redemption.
 *
 * Validation is centralised here so the checkout endpoint, dashboard
 * "preview discount" UI, and admin reporting all share one truth.
 */

import { prisma } from "@/lib/db";
import { cents, money, type Currency, type Money } from "@/lib/money";

export interface ValidatedPromo {
  promoCodeId: string;
  code:        string;
  discount:    Money;
  description: string | null;
}

export interface PromoValidationContext {
  /** Subtotal before discount. */
  subtotal: Money;
  eventId:  string;
  userId:   string;
}

/** Look up + validate a promo code for an order. Returns the discount
 *  amount (clamped to subtotal) plus the codeId so we can persist the
 *  redemption on the Order. Throws with a user-readable message when
 *  the code is invalid. */
export async function validatePromoCode(
  rawCode: string,
  ctx: PromoValidationContext
): Promise<ValidatedPromo> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Enter a promo code.");

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) throw new Error("That code isn't valid.");

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) throw new Error("That code isn't active yet.");
  if (promo.endsAt   && promo.endsAt   < now) throw new Error("That code has expired.");

  if (promo.eventId && promo.eventId !== ctx.eventId) {
    throw new Error("That code can't be used on this event.");
  }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    throw new Error("That code has been fully redeemed.");
  }
  if (promo.maxPerUser) {
    const usedByUser = await prisma.order.count({
      where: { promoCodeId: promo.id, userId: ctx.userId, status: { in: ["PAID", "PENDING"] } }
    });
    if (usedByUser >= promo.maxPerUser) {
      throw new Error("You've already used that code.");
    }
  }

  // Compute the discount, clamped to the subtotal so we never end up
  // with a negative total.
  let discountAmount: number;
  if (promo.discountType === "PERCENT") {
    discountAmount = Math.floor((ctx.subtotal.amount * promo.discountValue) / 100);
  } else {
    discountAmount = promo.discountValue;
  }
  if (discountAmount > ctx.subtotal.amount) discountAmount = ctx.subtotal.amount;
  if (discountAmount < 0) discountAmount = 0;

  return {
    promoCodeId: promo.id,
    code:        promo.code,
    description: promo.description,
    discount:    money(cents(discountAmount), ctx.subtotal.currency as Currency)
  };
}

/** Increment usage count after a successful order. Idempotent-safe
 *  enough for our needs (one row per redemption). */
export async function incrementPromoUsage(promoCodeId: string): Promise<void> {
  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data:  { usedCount: { increment: 1 } }
  });
}
