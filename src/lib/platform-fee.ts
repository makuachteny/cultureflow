/**
 * Platform fee policy.
 *
 * CultureFlow takes a percentage of every paid order. The percentage is set
 * via env var so it can move per market without a code change. We also
 * snapshot the fee on the Order at issue time, so historical reporting
 * stays correct if the env var changes later.
 */

import { isZero, money, multiply, subtract, type Money } from "@/lib/money";

/** Platform fee as a percentage (0..100). Defaults to 5 % when unset. */
export function platformFeePercent(): number {
  const raw = process.env.PLATFORM_FEE_PERCENT;
  const parsed = raw ? Number(raw) : 5;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return 5;
  return parsed;
}

/** Compute the breakdown for an order. Free orders return zeros. */
export function computeBreakdown(
  subtotal: Money,
  discount: Money = money(0, subtotal.currency)
): {
  subtotal:    Money;
  discount:    Money;
  platformFee: Money;
  organizerNet: Money;
  total:       Money;
} {
  const total = subtract(subtotal, discount);
  if (isZero(total)) {
    const zero = money(0, subtotal.currency);
    return {
      subtotal,
      discount,
      platformFee: zero,
      organizerNet: zero,
      total: zero
    };
  }
  const fee = multiply(total, platformFeePercent() / 100);
  return {
    subtotal,
    discount,
    platformFee:  fee,
    organizerNet: subtract(total, fee),
    total
  };
}
