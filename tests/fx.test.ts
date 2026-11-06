import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { convert, getRate } from "@/lib/fx";
import { money } from "@/lib/money";

describe("FX module", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns rate 1 when from === to without hitting the network", async () => {
    const spy = vi.fn();
    global.fetch = spy as unknown as typeof fetch;
    const rate = await getRate("USD", "USD");
    expect(rate).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("convert preserves Money invariants — integer cents in target currency", async () => {
    // Stub the upstream so we test the math, not the network.
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        base: "USD",
        rates: { USD: 1, KES: 130, EUR: 0.92 }
      }), { status: 200 })
    ) as unknown as typeof fetch;

    const m = await convert(money(1000, "USD"), "KES");  // $10 → KSh
    expect(m.currency).toBe("KES");
    expect(Number.isInteger(m.amount)).toBe(true);
    // 1000 cents * 130 = 130_000 (KES is also stored in 100ths-of-a-shilling
    // for parity with the rail APIs)
    expect(m.amount).toBe(130_000);

    const eu = await convert(money(1000, "USD"), "EUR");
    expect(eu.currency).toBe("EUR");
    expect(eu.amount).toBe(920);
  });

  it("falls back to the static rate table when the upstream errors", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    // Even with the upstream dead, conversion still works using the
    // hardcoded fallback.
    const m = await convert(money(100, "USD"), "GBP");
    expect(m.currency).toBe("GBP");
    expect(m.amount).toBeGreaterThan(0);
    expect(m.amount).toBeLessThan(150);  // ~ £0.79 of $1
  });
});
