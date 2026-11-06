/**
 * Stripe provider.
 *
 * Wraps Stripe Checkout Sessions for the buyer-facing flow and handles
 * application-fee + transfer routing for Stripe Connect (organizer
 * payouts). Webhook signature verification flows through the same
 * `STRIPE_WEBHOOK_SECRET` we used before the abstraction.
 */

import Stripe from "stripe";
import { cents, type Money } from "@/lib/money";
import type {
  PaymentProvider,
  PaymentInitiation,
  ChargeParams,
  RefundParams,
  RefundResult
} from "./types";

/* Lazy singleton — created on first use so tests + dev workflows that
 *  set STRIPE_SECRET_KEY after module-load still work. We re-key on the
 *  secret so a test that swaps the env mid-run gets a fresh client. */
let _stripe: { key: string; client: Stripe } | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (_stripe?.key === key) return _stripe.client;
  _stripe = { key, client: new Stripe(key) };
  return _stripe.client;
}

/* Currencies Stripe will accept from us. Stripe supports many more than
 *  this — we list the ones we actually price events in. */
const STRIPE_CURRENCIES = new Set([
  "USD", "GBP", "CAD", "AUD", "EUR", "KES", "UGX", "TZS", "EGP", "SDG"
]);

export const stripeProvider: PaymentProvider = {
  id: "STRIPE",

  isEnabled() {
    return getStripe() !== null;
  },

  supportsCurrency(currency) {
    return STRIPE_CURRENCIES.has(currency.toUpperCase());
  },

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured (set STRIPE_SECRET_KEY)");

    // Connect routing: when an organizer has a connected account, the
    // checkout session must `transfer_data.destination` to that account.
    // The platform's cut is `application_fee_amount` (in minor units of
    // the order's currency).
    const transferData = params.connect
      ? {
          destination: params.connect.accountId,
          ...(params.connect.applicationFee
            ? { application_fee_amount: params.connect.applicationFee.amount }
            : {})
        }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.customerEmail,
      // Explicitly accept every card-class method Stripe offers. Cards
      // covers credit + debit (Visa / Mastercard / Amex / Discover /
      // Diners / Maestro / Cartes Bancaires / Mada / etc.). Wallet
      // methods (Apple Pay, Google Pay, Link) are surfaced automatically
      // for browsers that support them. Bank-debit methods stay opt-in.
      payment_method_types: ["card"],
      // Localise the buyer-facing labels to the locale the buyer's
      // browser ships with — Stripe also auto-detects but being explicit
      // avoids the rare "wrong language" complaint.
      locale: "auto",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:    params.amount.currency.toLowerCase(),
            unit_amount: params.amount.amount,
            product_data: {
              // The single line item rolls up the whole order. We rely on
              // our own DB to break it back down by tier.
              name:        `CultureFlow order ${params.orderId.slice(0, 8).toUpperCase()}`,
              description: params.metadata?.eventTitle?.slice(0, 500) ?? "CultureFlow ticket"
            }
          }
        }
      ],
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
      ...(transferData
        ? {
            payment_intent_data: {
              ...(transferData.application_fee_amount !== undefined
                ? { application_fee_amount: transferData.application_fee_amount }
                : {}),
              transfer_data: { destination: transferData.destination }
            }
          }
        : {}),
      metadata: {
        orderId: params.orderId,
        ...(params.metadata ?? {})
      }
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    return {
      kind:              "redirect",
      paymentId:         "",       // filled in by caller
      providerPaymentId: session.id,
      redirectUrl:       session.url
    };
  },

  async refund(params: RefundParams): Promise<RefundResult> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured");
    // For Stripe, `providerPaymentId` is the Checkout Session id. Pull
    // the underlying PaymentIntent and refund against that.
    const session = await stripe.checkout.sessions.retrieve(params.providerPaymentId);
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!piId) throw new Error("Stripe session has no payment_intent — nothing to refund.");
    const refund = await stripe.refunds.create({
      payment_intent: piId,
      ...(params.amount ? { amount: params.amount.amount } : {}),
      ...(params.reason ? { metadata: { reason: params.reason } } : {})
    });
    return {
      providerRefundId: refund.id,
      amount: {
        amount: cents(refund.amount),
        currency: refund.currency.toUpperCase() as Money["currency"]
      }
    };
  },

  parseWebhook(rawBody, headers) {
    const stripe = getStripe();
    if (!stripe) return null;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig    = headers["stripe-signature"];
    if (!secret || !sig) return null;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch {
      return null;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const piAmount = (s.amount_total ?? 0);
        const piCurrency = (s.currency ?? "usd").toUpperCase();
        return {
          providerEventId:   event.id,
          type:              "payment.succeeded",
          providerPaymentId: s.id,
          amount: { amount: cents(piAmount), currency: piCurrency as Money["currency"] },
          raw: event
        };
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        return {
          providerEventId:   event.id,
          type:              "payment.failed",
          providerPaymentId: s.id,
          raw: event
        };
      }
      case "charge.refunded": {
        const c = event.data.object as Stripe.Charge;
        const sessionId = (c.metadata?.orderId ? c.metadata.orderId : null);
        // We can't reliably reverse-look-up the session id from a charge
        // here without an extra API call; the refund route handler does
        // that based on Order.id stored in metadata.
        return {
          providerEventId:   event.id,
          type:              "payment.refunded",
          providerPaymentId: sessionId ?? c.id,
          amount: { amount: cents(c.amount_refunded), currency: c.currency.toUpperCase() as Money["currency"] },
          raw: event
        };
      }
      default:
        return null;
    }
  }
};

/** Stripe Connect helpers — exposed so the connect-onboarding routes
 *  don't have to construct another Stripe client. */
export function stripeClient(): Stripe {
  const s = getStripe();
  if (!s) throw new Error("Stripe not configured");
  return s;
}

export function stripeIsEnabled(): boolean {
  return getStripe() !== null;
}
