import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeBreakdown, platformFeePercent } from "@/lib/platform-fee";
import { money } from "@/lib/money";

describe("platform-fee policy", () => {
  let prev: string | undefined;
  beforeEach(() => { prev = process.env.PLATFORM_FEE_PERCENT; });
  afterEach(() => {
    if (prev === undefined) delete process.env.PLATFORM_FEE_PERCENT;
    else process.env.PLATFORM_FEE_PERCENT = prev;
  });

  it("defaults to 5 % when PLATFORM_FEE_PERCENT is unset", () => {
    delete process.env.PLATFORM_FEE_PERCENT;
    expect(platformFeePercent()).toBe(5);
  });

  it("clamps invalid percentages back to the default", () => {
    process.env.PLATFORM_FEE_PERCENT = "-3";
    expect(platformFeePercent()).toBe(5);
    process.env.PLATFORM_FEE_PERCENT = "200";
    expect(platformFeePercent()).toBe(5);
    process.env.PLATFORM_FEE_PERCENT = "not-a-number";
    expect(platformFeePercent()).toBe(5);
  });

  it("computes subtotal/discount/total/fee/organizerNet", () => {
    process.env.PLATFORM_FEE_PERCENT = "10";
    const b = computeBreakdown(money(1000, "USD"), money(100, "USD"));
    expect(b.subtotal.amount).toBe(1000);
    expect(b.discount.amount).toBe(100);
    expect(b.total.amount).toBe(900);
    expect(b.platformFee.amount).toBe(90);   // 10 % of 900
    expect(b.organizerNet.amount).toBe(810); // 900 - 90
  });

  it("free orders return zero fee + zero organizer net", () => {
    const b = computeBreakdown(money(0, "USD"));
    expect(b.platformFee.amount).toBe(0);
    expect(b.organizerNet.amount).toBe(0);
    expect(b.total.amount).toBe(0);
  });

  it("100 %-discount orders also collapse to zero fee", () => {
    const b = computeBreakdown(money(500, "USD"), money(500, "USD"));
    expect(b.total.amount).toBe(0);
    expect(b.platformFee.amount).toBe(0);
    expect(b.organizerNet.amount).toBe(0);
  });
});
