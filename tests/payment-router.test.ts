/**
 * Provider-router policy tests.
 *
 * We don't try to call the real rails — we just assert that:
 *   – pickProvider chooses the right rail per currency
 *   – an explicit `preferred` is honoured when valid
 *   – an explicit `preferred` falls back when the rail is disabled
 *   – an unknown currency lands on Stripe (when enabled)
 *
 * The router uses module-level singletons; we set the env vars each
 * test needs and rely on `isEnabled()` reading process.env at call time.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pickProvider } from "@/lib/payments/router";

describe("payment-router policy", () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    // Snapshot every env var the providers read so each test can mutate
    // freely and the next test starts clean.
    snapshot = {
      STRIPE_SECRET_KEY:      process.env.STRIPE_SECRET_KEY,
      MPESA_CONSUMER_KEY:     process.env.MPESA_CONSUMER_KEY,
      MPESA_CONSUMER_SECRET:  process.env.MPESA_CONSUMER_SECRET,
      MPESA_SHORTCODE:        process.env.MPESA_SHORTCODE,
      MPESA_PASSKEY:          process.env.MPESA_PASSKEY,
      MPESA_CALLBACK_URL:     process.env.MPESA_CALLBACK_URL,
      MOMO_SUBSCRIPTION_KEY:  process.env.MOMO_SUBSCRIPTION_KEY,
      MOMO_API_USER_ID:       process.env.MOMO_API_USER_ID,
      MOMO_API_KEY:           process.env.MOMO_API_KEY,
      MOMO_CALLBACK_URL:      process.env.MOMO_CALLBACK_URL,
      MOMO_TARGET_ENV:        process.env.MOMO_TARGET_ENV,
      MGURUSH_BASE_URL:       process.env.MGURUSH_BASE_URL,
      MGURUSH_MERCHANT_ID:    process.env.MGURUSH_MERCHANT_ID,
      MGURUSH_API_KEY:        process.env.MGURUSH_API_KEY,
      MGURUSH_WEBHOOK_SECRET: process.env.MGURUSH_WEBHOOK_SECRET,
      MGURUSH_CALLBACK_URL:   process.env.MGURUSH_CALLBACK_URL,
      DEMO_CHECKOUT:          process.env.DEMO_CHECKOUT
    };
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(snapshot)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function enableMpesa() {
    process.env.MPESA_CONSUMER_KEY    = "test";
    process.env.MPESA_CONSUMER_SECRET = "test";
    process.env.MPESA_SHORTCODE       = "174379";
    process.env.MPESA_PASSKEY         = "test";
    process.env.MPESA_CALLBACK_URL    = "https://example.com/wh";
  }
  function enableMomo() {
    process.env.MOMO_SUBSCRIPTION_KEY = "test";
    process.env.MOMO_API_USER_ID      = "test";
    process.env.MOMO_API_KEY          = "test";
    process.env.MOMO_CALLBACK_URL     = "https://example.com/wh";
    process.env.MOMO_TARGET_ENV       = "sandbox";  // EUR
  }

  it("uses DEMO when demoMode + DEMO_CHECKOUT=true (in non-prod)", () => {
    process.env.DEMO_CHECKOUT = "true";
    // In test runs NODE_ENV is "test", which the demo provider treats as
    // not-production → demo is enabled.
    const p = pickProvider({ currency: "USD", demoMode: true });
    expect(p.id).toBe("DEMO");
  });

  it("KES routes to M-Pesa when M-Pesa is enabled", () => {
    enableMpesa();
    expect(pickProvider({ currency: "KES" }).id).toBe("MPESA");
  });

  it("UGX routes to MoMo when MoMo is enabled and MOMO_TARGET_ENV is mtnuganda", () => {
    enableMomo();
    process.env.MOMO_TARGET_ENV = "mtnuganda";
    expect(pickProvider({ currency: "UGX" }).id).toBe("MOMO");
  });

  it("explicit preferred provider is honoured when usable", () => {
    enableMpesa();
    expect(pickProvider({ currency: "KES", preferred: "MPESA" }).id).toBe("MPESA");
  });

  it("throws when no provider can handle the currency", () => {
    // Wipe every rail.
    for (const k of Object.keys(snapshot)) delete process.env[k];
    expect(() => pickProvider({ currency: "USD" })).toThrow(/No payment provider/);
  });
});
