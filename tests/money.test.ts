import { describe, it, expect } from "vitest";
import {
  cents, money, fromMajor, add, subtract, multiply, percent,
  format, formatCompact, isZero, isPositive, assertSameCurrency,
  isMobileMoneyCurrency
} from "@/lib/money";

describe("money primitives", () => {
  it("cents() rejects floats and non-finite values", () => {
    expect(() => cents(1.5)).toThrow(/integer/);
    expect(() => cents(NaN)).toThrow(/finite/);
    expect(() => cents(Infinity)).toThrow(/finite/);
    expect(cents(0)).toBe(0);
    expect(cents(500)).toBe(500);
  });

  it("fromMajor converts dollar floats to integer cents", () => {
    expect(fromMajor(1, "USD").amount).toBe(100);
    expect(fromMajor(1.99, "USD").amount).toBe(199);
    // banker's rounding edge case
    expect(fromMajor(0.005, "USD").amount).toBeGreaterThanOrEqual(0);
  });

  it("add / subtract / multiply preserve currency and stay integer", () => {
    const a = money(500, "USD");
    const b = money(150, "USD");
    expect(add(a, b).amount).toBe(650);
    expect(subtract(a, b).amount).toBe(350);
    expect(multiply(a, 0.1).amount).toBe(50);
  });

  it("assertSameCurrency throws on mismatched currencies", () => {
    expect(() => add(money(100, "USD"), money(100, "KES"))).toThrow(/Currency mismatch/);
    expect(() => assertSameCurrency(money(0, "USD"), money(0, "GBP"))).toThrow();
  });

  it("percent computes a cut, rounded to nearest cent", () => {
    expect(percent(money(1000, "USD"), 5).amount).toBe(50);
    expect(percent(money(999, "USD"), 5).amount).toBe(50);  // round
    expect(percent(money(0, "USD"), 100).amount).toBe(0);
  });

  it("isZero / isPositive predicates", () => {
    expect(isZero(money(0, "USD"))).toBe(true);
    expect(isPositive(money(1, "USD"))).toBe(true);
    expect(isPositive(money(-1, "USD"))).toBe(false);
  });

  it("format and formatCompact produce sensible currency strings", () => {
    expect(format(money(500, "USD"), "en-US")).toMatch(/\$5\.00/);
    expect(formatCompact(money(500, "USD"), "en-US")).toMatch(/\$5/);
    // Compact still shows decimals when amount has fractional part.
    expect(formatCompact(money(550, "USD"), "en-US")).toMatch(/\$5\.50/);
  });

  it("isMobileMoneyCurrency picks the African mobile-money rails", () => {
    for (const c of ["KES", "UGX", "RWF", "TZS", "SSP"] as const) {
      expect(isMobileMoneyCurrency(c)).toBe(true);
    }
    for (const c of ["USD", "GBP", "EUR", "EGP", "SDG"] as const) {
      expect(isMobileMoneyCurrency(c)).toBe(false);
    }
  });
});
