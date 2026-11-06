/**
 * Finance math + org preferences. Payouts, charges, credits and invoices
 * are all views on the existing Order/Payment/RefundRequest data — there
 * are no dedicated tables — so this file owns the derivation logic.
 *
 * Two fees stack on every paid order:
 *   1. Platform fee  — CultureFlow's commission. % set by PLATFORM_FEE_PERCENT.
 *   2. Processor fee — what the rail (Stripe / M-Pesa / MoMo) charges.
 *
 * The "fee model" cookie controls who pays the *processor* fee:
 *   - "pass_on" — attendee pays gross = ticket + processor_fee.
 *                 Organizer nets   = ticket − platform_fee.
 *   - "absorb"  — attendee pays gross = ticket.
 *                 Organizer nets   = ticket − processor_fee − platform_fee.
 *
 * Platform fee is ALWAYS deducted from the organizer's take — it isn't
 * affected by the pass_on/absorb toggle.
 */

import { cookies } from "next/headers";
import { platformFeePercent } from "@/lib/platform-fee";

export type FeeModel = "pass_on" | "absorb";
export type PayMethod = "card" | "mobile";

const CARD_BPS = 290;   // 2.90%
const CARD_FLAT_CENTS = 50;
const MOBILE_BPS = 250; // 2.50%
const MOBILE_FLAT_CENTS = 25;

const FEE_COOKIE = "ssd_fee_model";

/**
 * Processor fee (Stripe / M-Pesa / MoMo / m-Gurush) for a given gross.
 * We infer mobile-money vs. card from the payment provider string;
 * anything non-stripe is treated as mobile money (lower rate).
 */
export function calcFeeCents(grossCents: number, method: PayMethod): number {
  if (grossCents <= 0) return 0;
  const [bps, flat] = method === "card" ? [CARD_BPS, CARD_FLAT_CENTS] : [MOBILE_BPS, MOBILE_FLAT_CENTS];
  return Math.round((grossCents * bps) / 10000) + flat;
}

/** Platform fee (CultureFlow commission) on a base. */
export function calcPlatformFeeCents(baseCents: number): number {
  if (baseCents <= 0) return 0;
  return Math.round(baseCents * (platformFeePercent() / 100));
}

export function inferMethod(provider: string | null | undefined): PayMethod {
  return provider && provider.toLowerCase() === "stripe" ? "card" : "mobile";
}

/**
 * Full amount split. Returns every line a finance dashboard needs:
 *   - grossCents     — what the attendee paid
 *   - processorFeeCents — Stripe / M-Pesa / MoMo cut
 *   - platformFeeCents  — CultureFlow commission
 *   - feeCents       — DEPRECATED alias (= processorFee). Kept for
 *                      callers that haven't migrated; new code should
 *                      reference processorFeeCents + platformFeeCents.
 *   - netCents       — what reaches the organizer
 */
export function splitAmount(
  ticketCents: number,
  method: PayMethod,
  model: FeeModel
): {
  grossCents:        number;
  processorFeeCents: number;
  platformFeeCents:  number;
  /** Alias of processorFeeCents — see deprecation note above. */
  feeCents:          number;
  netCents:          number;
} {
  const processorFee = calcFeeCents(ticketCents, method);
  const platformFee  = calcPlatformFeeCents(ticketCents);

  if (model === "pass_on") {
    // Attendee pays processor fee on top; organizer nets ticket - platform.
    return {
      grossCents:        ticketCents + processorFee,
      processorFeeCents: processorFee,
      platformFeeCents:  platformFee,
      feeCents:          processorFee,
      netCents:          Math.max(0, ticketCents - platformFee)
    };
  }
  // "absorb" — organizer eats both fees.
  return {
    grossCents:        ticketCents,
    processorFeeCents: processorFee,
    platformFeeCents:  platformFee,
    feeCents:          processorFee,
    netCents:          Math.max(0, ticketCents - processorFee - platformFee)
  };
}

export function readFeeModel(): FeeModel {
  return cookies().get(FEE_COOKIE)?.value === "absorb" ? "absorb" : "pass_on";
}

export const FEE_COOKIE_NAME = FEE_COOKIE;
