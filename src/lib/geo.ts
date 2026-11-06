import { headers } from "next/headers";

/**
 * Request-aware geographic defaulting. We pick a plausible "local" city
 * for the visitor based on edge headers so the homepage lands on
 * something relevant without a manual click.
 *
 * Country code sources (first hit wins):
 *   • Vercel edge:   x-vercel-ip-country
 *   • Cloudflare:    cf-ipcountry
 *   • Custom proxy:  x-country
 *   • Fallback:      Accept-Language hint (en-US / en-GB / en-AU / en-CA)
 *
 * We intentionally don't do IP lookups client-side — that would leak the
 * user's IP to a third party. Edge headers are already on the request.
 *
 * The mapping picks the largest South Sudanese diaspora hub in each
 * country. Attendees and organizers can always override via the city
 * filter on /browse.
 */

const COUNTRY_TO_CITY: Record<string, string> = {
  SS: "Juba",
  US: "Omaha",
  CA: "Calgary",
  GB: "London",
  UK: "London",
  AU: "Melbourne",
  KE: "Nairobi",
  UG: "Kampala",
  SD: "Khartoum",
  EG: "Cairo"
};

/** Default when no signal — Juba is home. */
const FALLBACK_CITY = "Juba";

/** ISO-4217 local currency for each country we support transacting in.
 *  Used by the checkout flow to charge the buyer in the currency they
 *  hold in their wallet, rather than forcing them to pay in the
 *  organizer's currency.
 *
 *  Anything not listed defaults to USD on the buyer side and is later
 *  converted via FX at checkout. */
import type { Currency } from "@/lib/money";

const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  US: "USD", CA: "CAD", GB: "GBP", UK: "GBP", AU: "AUD",
  IE: "EUR", FR: "EUR", DE: "EUR", NL: "EUR", BE: "EUR", IT: "EUR",
  ES: "EUR", PT: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
  KE: "KES",
  UG: "UGX",
  RW: "RWF",
  TZ: "TZS",
  EG: "EGP",
  SS: "SSP",
  SD: "SDG"
};

/** Pick the currency to bill a buyer in, based on edge geo headers.
 *  Returns USD when we don't have a confident signal — Stripe accepts
 *  any card in USD and FX handles the conversion on the issuing bank
 *  side, so this is a safe default. */
export function detectCurrency(): Currency {
  const country = detectCountry();
  if (country && COUNTRY_TO_CURRENCY[country]) return COUNTRY_TO_CURRENCY[country];
  return "USD";
}

export function detectCountry(): string | null {
  const h = headers();
  const explicit =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country");
  if (explicit && explicit.length === 2) return explicit.toUpperCase();

  // Accept-Language heuristic: "en-US,en;q=0.9" → US
  const al = h.get("accept-language") || "";
  const match = al.match(/\b([a-z]{2})-([A-Z]{2})\b/);
  if (match) return match[2].toUpperCase();
  return null;
}

export function defaultCityForRequest(): string {
  const country = detectCountry();
  if (country && COUNTRY_TO_CITY[country]) return COUNTRY_TO_CITY[country];
  return FALLBACK_CITY;
}
