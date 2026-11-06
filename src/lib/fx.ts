/**
 * Foreign-exchange conversion.
 *
 * Buyers pay in their own currency; organizers price in whatever they
 * priced in. This module bridges the two by quoting an FX rate per pair.
 *
 * Source: exchangerate.host (free, no API key, daily-updated open rates).
 * Override with `FX_PROVIDER_URL` if you want to point at a paid feed
 * (Open Exchange Rates, Fixer, Wise) — same response shape `{ rates: {} }`
 * keyed by ISO-4217 code.
 *
 * Caching: rates are pulled once per `FX_TTL_SECONDS` (default 6 h) and
 * memoised in process. Prod fleets behind multiple replicas refetch
 * independently — that's fine, the upstream is idempotent and free.
 *
 * Resilience: if the upstream fails, we fall back to a hardcoded set
 * of "good enough for emergencies" rates so checkout never breaks. The
 * fallback rates are the ones that were correct on the date in
 * `FALLBACK_RATES_AS_OF` — refresh them when you bump the dependency
 * deck.
 */

import { cents, money, type Currency, type Money } from "@/lib/money";

const TTL_MS = (() => {
  const raw = Number(process.env.FX_TTL_SECONDS);
  if (Number.isFinite(raw) && raw >= 60) return raw * 1000;
  return 6 * 60 * 60 * 1000; // 6 hours
})();

const PROVIDER_URL = process.env.FX_PROVIDER_URL ?? "https://api.exchangerate.host/latest";

/* ─── Fallback rates (1 USD = X currency) ───
 *  Refreshed: 2026-04-25. Off by a few percent vs. live; only used if the
 *  upstream is unreachable. Add new currencies here when you onboard a
 *  new market. */
const FALLBACK_RATES_AS_OF = "2026-04-25";
const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1.00,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.55,
  EUR: 0.92,
  KES: 132.0,    // Kenyan shilling
  UGX: 3800.0,   // Ugandan shilling
  RWF: 1320.0,   // Rwandan franc
  TZS: 2700.0,   // Tanzanian shilling
  EGP: 49.0,     // Egyptian pound
  SSP: 4500.0,   // South Sudanese pound
  SDG: 600.0     // Sudanese pound
};

/* ─── In-process cache ─── */
type RateTable = { base: Currency; rates: Record<string, number>; fetchedAt: number };
let cached: RateTable | null = null;
let inflight: Promise<RateTable> | null = null;

async function fetchRates(): Promise<RateTable> {
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`${PROVIDER_URL}?base=USD`, {
        // 6-second budget — slow upstream shouldn't block a checkout.
        signal: AbortSignal.timeout(6_000)
      });
      if (!res.ok) throw new Error(`fx upstream ${res.status}`);
      const data = (await res.json()) as { base?: string; rates?: Record<string, number> };
      const rates = data.rates;
      if (!rates) throw new Error("fx upstream: missing rates");
      cached = { base: "USD", rates, fetchedAt: Date.now() };
    } catch {
      // Fallback: serve the static table so checkout never hard-fails.
      cached = {
        base:      "USD",
        rates:     FALLBACK_RATES,
        fetchedAt: Date.now() - TTL_MS / 2  // half-life so we retry later
      };
    } finally {
      inflight = null;
    }
    return cached!;
  })();
  return inflight;
}

/** Return the cross-rate FROM `from` TO `to` (i.e. multiply `from` by
 *  this number to get the equivalent amount in `to`). */
export async function getRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;
  const t = await fetchRates();
  const fromUsd = from === "USD" ? 1 : t.rates[from];
  const toUsd   = to   === "USD" ? 1 : t.rates[to];
  if (!fromUsd || !toUsd) {
    // Last-ditch fallback to the static table (in case the upstream
    // returned a slim ratebook missing one of our currencies).
    const fb = FALLBACK_RATES;
    if (!fb[from] || !fb[to]) {
      throw new Error(`No FX rate for ${from}→${to}`);
    }
    return fb[to] / fb[from];
  }
  return toUsd / fromUsd;
}

/** Convert a Money value into another currency, returning a fresh Money. */
export async function convert(input: Money, to: Currency): Promise<Money> {
  if (input.currency === to) return input;
  const rate = await getRate(input.currency as Currency, to);
  // Round to the nearest minor unit. Bankers' rounding would be more
  // correct for FX but floor-then-add half is what every Stripe-style
  // API does internally, and the error per transaction is < 1 cent.
  const converted = Math.round(input.amount * rate);
  return money(cents(converted), to);
}

/** Pretty fallback metadata for diagnostic surfaces. */
export function fallbackMeta(): { asOf: string; rates: Record<Currency, number> } {
  return { asOf: FALLBACK_RATES_AS_OF, rates: FALLBACK_RATES };
}
