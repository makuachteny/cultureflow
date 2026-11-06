/**
 * Payment-provider abstraction.
 *
 * Every rail (Stripe, M-Pesa Daraja, MTN MoMo, m-Gurush) implements the
 * `PaymentProvider` interface in this file. The checkout endpoint never
 * touches a provider directly; it asks the router (`./router.ts`) to pick
 * a provider for the order and then drives it through these methods.
 *
 * The interface is deliberately minimal — every payment rail can be
 * shoehorned into "start a charge → wait for the gateway to call back
 * → mark the order paid → optionally refund later". Providers that
 * require interactive flows (Stripe Checkout redirects, M-Pesa STK
 * Push to a phone, etc.) return a `PaymentInitiation` describing what
 * the client should do next.
 */

import type { PaymentProvider as DbPaymentProvider } from "@prisma/client";
import type { Money } from "@/lib/money";

/* ─── Initiation result ────────────────────────────────────────── */

export type InitiationKind =
  /** Buyer must be redirected to a hosted checkout page (Stripe). */
  | "redirect"
  /** A push notification was sent to the buyer's phone (M-Pesa STK,
   *  MoMo Request-to-Pay). The client polls /api/checkout/status until
   *  the rail's webhook fires. */
  | "mobile-push"
  /** A purely server-side capture happened — order is already paid
   *  (used by the DEMO provider and by free-event short-circuit). */
  | "captured"
  /** The provider needs more info before it can charge — e.g. M-Pesa
   *  prompts for the buyer's MSISDN. */
  | "needs-input";

export type PaymentInitiation =
  | {
      kind: "redirect";
      /** Where the client should `window.location = …` next. */
      redirectUrl: string;
      paymentId:   string;          // local Payment.id
      providerPaymentId: string;    // session id / intent id / etc.
    }
  | {
      kind: "mobile-push";
      paymentId: string;
      providerPaymentId: string;
      /** Human-readable summary: "We sent a payment prompt to +254 7xx xxx xxx." */
      message: string;
      /** ISO-8601 timestamp the prompt expires at. */
      expiresAt: string;
    }
  | {
      kind: "captured";
      paymentId: string;
      providerPaymentId: string;
    }
  | {
      kind:    "needs-input";
      missing: "msisdn";   // we may add more here later
    };

/* ─── Charge / refund parameters ───────────────────────────────── */

export interface ChargeParams {
  /** Local Order.id — also the idempotency key for the rail. */
  orderId: string;
  /** Total to charge, in the order's currency. */
  amount:  Money;
  /** Buyer-facing email. Stripe shows this on the receipt; mobile-money
   *  rails ignore it. */
  customerEmail: string;
  /** Buyer-facing display name. Optional but improves the rail's audit log. */
  customerName?:  string;
  /** Mobile-money rails: the buyer's phone number in E.164 (+254700123456).
   *  Required by M-Pesa, MoMo, m-Gurush; ignored by Stripe.            */
  msisdn?: string;
  /** Where to send the buyer when redirect-style checkout finishes. */
  successUrl: string;
  cancelUrl:  string;
  /** Optional connected-account / merchant override.
   *    – Stripe Connect: the organizer's `acct_xxx` and `applicationFee`
   *    – Mobile rails:    the organizer's till / paybill / merchant code */
  connect?: {
    accountId:           string;
    /** Platform fee, in the same currency as `amount`. */
    applicationFee?:     Money;
    payeeMsisdn?:        string;
  };
  /** Free-form metadata stored on the rail's side (Stripe metadata, MoMo
   *  payerNote, etc.). Useful for support / reconciliation. */
  metadata?: Record<string, string>;
}

export interface RefundParams {
  paymentId:        string; // local Payment.id
  providerPaymentId: string;
  /** Partial-refund amount. Omit for a full refund. */
  amount?:          Money;
  reason?:          string;
}

export interface RefundResult {
  /** Provider-side refund id (rfn_xxx, etc.). */
  providerRefundId: string;
  /** Amount actually refunded — sometimes the rail rejects partials. */
  amount: Money;
}

/* ─── Webhook-event signal ─────────────────────────────────────── */

/** Normalised webhook event used internally after a provider parses its
 *  rail-specific payload. Lets one shared finalisation routine handle
 *  every rail. */
export interface NormalisedEvent {
  /** Provider event id — used for idempotency dedupe. */
  providerEventId:  string;
  type: "payment.succeeded" | "payment.failed" | "payment.refunded" | "payment.cancelled";
  providerPaymentId: string;
  /** What the provider says was actually charged / refunded. */
  amount?: Money;
  /** Provider's own fee on the transaction, if known at event time. */
  providerFee?: Money;
  /** Free-form payload we want to persist for support / debugging. */
  raw?: unknown;
}

/* ─── Provider interface ───────────────────────────────────────── */

export interface PaymentProvider {
  /** Which rail this implementation represents. Used to tag the
   *  `Payment.provider` row + look the implementation up by enum. */
  readonly id: DbPaymentProvider;

  /** Whether this provider has the env / config required to actually
   *  transact. The router skips disabled providers when picking. */
  isEnabled(): boolean;

  /** Whether this provider supports a given currency. The router uses
   *  this to short-circuit obviously-wrong combinations (e.g. M-Pesa
   *  doesn't support USD). */
  supportsCurrency(currency: string): boolean;

  /** Kick off a charge. The provider creates whatever rail-side records
   *  it needs (Stripe Checkout Session, M-Pesa STK push, etc.) and
   *  returns a `PaymentInitiation` telling the client what to do. */
  charge(params: ChargeParams): Promise<PaymentInitiation>;

  /** Refund a previously-succeeded payment. */
  refund(params: RefundParams): Promise<RefundResult>;

  /** Verify an incoming webhook payload and, if valid, normalise it.
   *  Returning `null` means the event isn't actionable (e.g. an
   *  irrelevant Stripe event type) — the route handler should ack
   *  with 200 to stop the rail from retrying. */
  parseWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | undefined>
  ): NormalisedEvent | null;
}
