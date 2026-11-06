/**
 * Payment-provider router.
 *
 * Turns a (currency, optional-explicit-provider) pair into the
 * `PaymentProvider` instance that should handle the order. Encapsulates
 * the policy of which rail to use for which currency:
 *
 *   – KES         → M-Pesa (Safaricom Daraja)
 *   – UGX/RWF/SSP → MTN MoMo Collections
 *   – SSP (alt.)  → m-Gurush
 *   – Anything else → Stripe (cards, Apple Pay, Google Pay)
 *
 * Buyers can explicitly request a provider in checkout payload
 * (e.g. "I'd rather use a card even though I'm in Kenya"); the router
 * honours that as long as the provider is enabled AND supports the
 * order's currency.
 */

import type { PaymentProvider as DbPaymentProvider } from "@prisma/client";
import type { PaymentProvider } from "./types";
import { stripeProvider }      from "./stripe";
import { mpesaProvider }       from "./mpesa";
import { momoProvider }        from "./momo";
import { mgurushProvider }     from "./mgurush";
import { demoProvider }        from "./demo";

const ALL: PaymentProvider[] = [
  stripeProvider,
  mpesaProvider,
  momoProvider,
  mgurushProvider,
  demoProvider
];

const BY_ID = new Map<DbPaymentProvider, PaymentProvider>(ALL.map((p) => [p.id, p]));

/** Default rail for each currency, in preference order. The first enabled
 *  + supported provider wins. */
const PREFERENCE: Record<string, DbPaymentProvider[]> = {
  KES:  ["MPESA",   "STRIPE"],
  TZS:  ["MPESA",   "STRIPE"],
  UGX:  ["MOMO",    "STRIPE"],
  RWF:  ["MOMO",    "STRIPE"],
  SSP:  ["MGURUSH", "MOMO", "STRIPE"],
  USD:  ["STRIPE"],
  GBP:  ["STRIPE"],
  CAD:  ["STRIPE"],
  AUD:  ["STRIPE"],
  EUR:  ["STRIPE"],
  EGP:  ["STRIPE"],
  SDG:  ["STRIPE"]
};

export function getProvider(id: DbPaymentProvider): PaymentProvider {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown payment provider: ${id}`);
  return p;
}

/** Pick the right provider for an order's currency. If the caller
 *  requested a specific provider, honour that as long as it can do the
 *  job. Otherwise consult the preference table. Falls back to Stripe
 *  if everything else is disabled (and Stripe supports the currency). */
export function pickProvider({
  currency,
  preferred,
  demoMode = false
}: {
  currency: string;
  preferred?: DbPaymentProvider;
  /** When true, the DEMO provider is allowed (dev-only). */
  demoMode?: boolean;
}): PaymentProvider {
  if (demoMode) {
    const demo = BY_ID.get("DEMO")!;
    if (demo.isEnabled()) return demo;
  }

  const isUsable = (p: PaymentProvider) =>
    p.isEnabled() && p.supportsCurrency(currency);

  // 1. Honour an explicit preference if it's a valid choice.
  if (preferred) {
    const explicit = BY_ID.get(preferred);
    if (explicit && isUsable(explicit)) return explicit;
  }

  // 2. Walk the preference table for the currency.
  for (const id of PREFERENCE[currency.toUpperCase()] ?? ["STRIPE"]) {
    const p = BY_ID.get(id);
    if (p && isUsable(p)) return p;
  }

  // 3. Last-ditch fallback: anything enabled that can handle the currency.
  for (const p of ALL) if (isUsable(p)) return p;

  throw new Error(
    `No payment provider configured for currency ${currency}. ` +
    `Set credentials for at least one of: ${ALL.map((p) => p.id).join(", ")}.`
  );
}

/** Iterate every enabled rail. Used by webhook routing — when a request
 *  comes in we don't know which provider it's from until we try parsing. */
export function enabledProviders(): PaymentProvider[] {
  return ALL.filter((p) => p.isEnabled());
}
