/**
 * Demo / dev provider — captures "payment" instantly without touching any
 * real rail. Enabled only when DEMO_CHECKOUT=true and we're not in
 * production (the env module hard-refuses prod with this on).
 *
 * Useful for:
 *   – walking a designer through the full purchase flow without Stripe keys
 *   – running smoke tests against a live dev server
 *   – demoing the app to a stakeholder
 */

import { randomBytes } from "node:crypto";
import type {
  PaymentProvider,
  PaymentInitiation,
  ChargeParams,
  RefundParams,
  RefundResult,
  NormalisedEvent
} from "./types";

export const demoProvider: PaymentProvider = {
  id: "DEMO",

  isEnabled() {
    return process.env.DEMO_CHECKOUT === "true" && process.env.NODE_ENV !== "production";
  },

  supportsCurrency() {
    return true;
  },

  async charge(_params: ChargeParams): Promise<PaymentInitiation> {
    void _params;
    // Mark as captured immediately. Caller will issue tickets.
    return {
      kind: "captured",
      paymentId: "",                                                 // filled in by caller
      providerPaymentId: `demo_${randomBytes(8).toString("hex")}`
    };
  },

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      providerRefundId: `demo_refund_${randomBytes(8).toString("hex")}`,
      amount: params.amount ?? { amount: 0 as never, currency: "USD" }
    };
  },

  parseWebhook(): NormalisedEvent | null {
    // Demo doesn't fire webhooks (capture happens inline).
    return null;
  }
};
