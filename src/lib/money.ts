/**
 * Money primitives.
 *
 * Two ground rules for every monetary value in this codebase:
 *   1. **Always store and pass minor units (cents).** Never floats. The
 *      `Cents` brand makes accidental float math a type error.
 *   2. **Always carry a currency code with the amount.** A bare integer
 *      tells you nothing about real-world value; pair it with `Currency`.
 *
 * If you find yourself dividing by 100 or formatting `$5.00` by hand,
 * stop and use these helpers.
 */

/** ISO 4217 currency code. Add to this union when you onboard a new market. */
export type Currency =
  | "USD"   // platform default (US)
  | "GBP"   // United Kingdom
  | "CAD"   // Canada
  | "AUD"   // Australia
  | "EUR"   // Eurozone
  | "KES"   // Kenya — M-Pesa
  | "UGX"   // Uganda — MTN MoMo, Airtel Money
  | "RWF"   // Rwanda — MTN MoMo
  | "TZS"   // Tanzania — M-Pesa, Tigo Pesa, Airtel Money
  | "EGP"   // Egypt
  | "SSP"   // South Sudan — m-Gurush, MTN MoMo SS
  | "SDG";  // Sudan

export const CURRENCIES = [
  "USD", "GBP", "CAD", "AUD", "EUR",
  "KES", "UGX", "RWF", "TZS", "EGP",
  "SSP", "SDG"
] as const satisfies ReadonlyArray<Currency>;

/** Branded Int — a count of currency minor units (cents, pence, kobo, etc.).
 *  Use `cents()` to construct. Arithmetic is plain `number` ops; the brand
 *  exists only at the type layer to catch raw-float misuse. */
export type Cents = number & { readonly __brand: "Cents" };

/** A signed amount in a specific currency. The currency travels with
 *  the integer everywhere — see `assertSameCurrency` for the safety net. */
export interface Money {
  readonly amount:   Cents;
  readonly currency: Currency;
}

/* ────────── Constructors ────────── */

export function cents(n: number): Cents {
  if (!Number.isFinite(n)) throw new Error("Cents must be finite");
  if (!Number.isInteger(n)) throw new Error("Cents must be an integer");
  return n as Cents;
}

export function money(amount: number, currency: Currency): Money {
  return { amount: cents(amount), currency };
}

/** Convert a major-unit float (`5.00`) to `Cents` (`500`).
 *  Use ONLY at user-input boundaries — never inside calculations. */
export function fromMajor(major: number, currency: Currency): Money {
  const factor = currencyMinorUnits(currency);
  return money(Math.round(major * factor), currency);
}

/* ────────── Arithmetic ────────── */

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiply(m: Money, factor: number): Money {
  return money(Math.round(m.amount * factor), m.currency);
}

/** Take a percentage cut (e.g. a 5% platform fee). Returns the cut, NOT
 *  the remainder. Always rounds to the nearest minor unit. */
export function percent(m: Money, percentNumber: number): Money {
  return multiply(m, percentNumber / 100);
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

export function isPositive(m: Money): boolean {
  return m.amount > 0;
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: ${a.currency} vs ${b.currency}. ` +
      `Multi-currency arithmetic must go through an FX layer.`
    );
  }
}

/* ────────── Formatting ────────── */

/** Format a Money value for human display. Locale defaults to the user's
 *  browser locale on the client, "en-US" on the server. */
export function format(m: Money, locale?: string): string {
  return new Intl.NumberFormat(locale ?? defaultLocale(), {
    style:    "currency",
    currency: m.currency
  }).format(m.amount / currencyMinorUnits(m.currency));
}

/** Compact format ("$5" instead of "$5.00") for free / round amounts only. */
export function formatCompact(m: Money, locale?: string): string {
  const minor = currencyMinorUnits(m.currency);
  if (m.amount % minor === 0) {
    return new Intl.NumberFormat(locale ?? defaultLocale(), {
      style:                 "currency",
      currency:              m.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(m.amount / minor);
  }
  return format(m, locale);
}

function defaultLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en-US";
}

/* ────────── Currency metadata ────────── */

/** Number of minor units per major unit. Most currencies are 100, but
 *  Japanese yen would be 1, Tunisian dinar 1000, etc. We list only what
 *  we actually accept. */
export function currencyMinorUnits(currency: Currency): number {
  // All currencies we accept use 100 minor-units-per-major.
  // (UGX is technically zero-decimal in practice but we still bill in
  // hundredths of a shilling for parity with M-Pesa / MoMo APIs.)
  void currency;
  return 100;
}

/** Quick check: is this currency the local on-the-ground currency for any
 *  of the in-Africa mobile-money rails? Used by the provider router to
 *  pick the right rail for an event without the organizer having to. */
export function isMobileMoneyCurrency(currency: Currency): boolean {
  return ["KES", "UGX", "RWF", "TZS", "SSP"].includes(currency);
}
