/**
 * m-Gurush provider — South Sudan mobile money.
 *
 * m-Gurush (a Trinity Technologies / Zain SS product) is the dominant
 * mobile-money rail inside South Sudan but doesn't have a widely-published
 * public REST API. To go live you need to:
 *
 *   1. Sign a merchant agreement with m-Gurush (their commercial team
 *      provides the API specification + sandbox credentials).
 *   2. Implement the actual HTTP calls in `mgurushHttp()` below — the
 *      shape is left as TODOs because we don't want to ship guesses
 *      against a contract you're going to sign.
 *
 * What's already wired (you don't have to touch):
 *   – Provider registration in the router
 *   – Currency check (SSP only)
 *   – Webhook normalisation (your handler can reuse the standard
 *     `parseWebhook → finalise → issue tickets` plumbing the other
 *     providers use)
 *
 * Required env vars (placeholders — finalise once you have the spec):
 *   MGURUSH_ENV             "sandbox" | "production"
 *   MGURUSH_BASE_URL        https URL of the m-Gurush API host
 *   MGURUSH_MERCHANT_ID     your merchant code
 *   MGURUSH_API_KEY         issued at onboarding
 *   MGURUSH_WEBHOOK_SECRET  shared secret for HMAC verification
 *   MGURUSH_CALLBACK_URL    public https URL of /api/webhooks/mgurush
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cents } from "@/lib/money";
import type {
  PaymentProvider,
  PaymentInitiation,
  ChargeParams,
  RefundParams,
  RefundResult,
  NormalisedEvent
} from "./types";

function isConfigured(): boolean {
  return Boolean(
    process.env.MGURUSH_BASE_URL &&
      process.env.MGURUSH_MERCHANT_ID &&
      process.env.MGURUSH_API_KEY &&
      process.env.MGURUSH_WEBHOOK_SECRET &&
      process.env.MGURUSH_CALLBACK_URL
  );
}

/** Stub HTTP client — fill in once the gateway spec is available. */
async function mgurushHttp(
  path: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const base   = String(process.env.MGURUSH_BASE_URL).replace(/\/$/, "");
  const apiKey = String(process.env.MGURUSH_API_KEY);
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`m-Gurush ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

function normaliseSouthSudanMsisdn(input: string): string {
  const s = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (s.startsWith("0")) return "211" + s.slice(1);
  if (s.startsWith("211")) return s;
  throw new Error(`Phone number ${input} doesn't look like a South Sudanese MSISDN.`);
}

export const mgurushProvider: PaymentProvider = {
  id: "MGURUSH",

  isEnabled() {
    return isConfigured();
  },

  supportsCurrency(currency) {
    return currency.toUpperCase() === "SSP";
  },

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    if (!isConfigured()) throw new Error("m-Gurush not configured");
    if (!params.msisdn) {
      return { kind: "needs-input", missing: "msisdn" };
    }
    if (params.amount.currency !== "SSP") {
      throw new Error("m-Gurush only accepts SSP.");
    }
    const phone = normaliseSouthSudanMsisdn(params.msisdn);
    const reference = randomUUID();

    // The actual endpoint name + payload shape depends on the m-Gurush
    // contract. The fields below are the best-guess based on similar
    // EAC mobile-money APIs; finalise once you have the spec PDF.
    await mgurushHttp("/v1/payments/initiate", {
      merchantId:  String(process.env.MGURUSH_MERCHANT_ID),
      reference,
      amount:      params.amount.amount / 100, // major units (SSP)
      currency:    "SSP",
      msisdn:      phone,
      description: `CultureFlow order ${params.orderId.slice(0, 8).toUpperCase()}`,
      callbackUrl: String(process.env.MGURUSH_CALLBACK_URL)
    });

    return {
      kind:              "mobile-push",
      paymentId:         "",
      providerPaymentId: reference,
      message:           `We sent an m-Gurush prompt to +${phone}. Approve it on your handset to complete checkout.`,
      expiresAt:         new Date(Date.now() + 120_000).toISOString()
    };
  },

  async refund(params: RefundParams): Promise<RefundResult> {
    void params;
    throw new Error(
      "Automatic m-Gurush refund not yet wired. Reverse the transaction " +
      "in the m-Gurush merchant portal, then mark the refund APPROVED."
    );
  },

  parseWebhook(rawBody, headers): NormalisedEvent | null {
    // HMAC verification — we expect the gateway to sign each callback
    // with the shared secret and pass it in `X-mGurush-Signature`.
    // (Confirm header name once contract is signed.)
    const secret    = process.env.MGURUSH_WEBHOOK_SECRET;
    const signature = headers["x-mgurush-signature"] || headers["X-mGurush-Signature"];
    if (!secret || !signature) return null;
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    const expected = createHmac("sha256", secret).update(bodyStr).digest("hex");
    try {
      if (
        Buffer.from(signature).length !== Buffer.from(expected).length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      ) {
        return null;
      }
    } catch {
      return null;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(bodyStr);
    } catch {
      return null;
    }

    const reference = (payload.reference ?? payload.transactionId) as string | undefined;
    const status    = String(payload.status ?? "").toUpperCase();
    if (!reference) return null;

    if (status === "SUCCESS" || status === "SUCCESSFUL" || status === "COMPLETED") {
      const amountMajor = Number(payload.amount ?? 0);
      return {
        providerEventId:   `mgurush_${reference}`,
        type:              "payment.succeeded",
        providerPaymentId: reference,
        amount: { amount: cents(Math.round(amountMajor * 100)), currency: "SSP" },
        raw: payload
      };
    }
    return {
      providerEventId:   `mgurush_${reference}_${status || "failed"}`,
      type:              "payment.failed",
      providerPaymentId: reference,
      raw: payload
    };
  }
};

export function normaliseSouthSudanPhone(input: string): string {
  return normaliseSouthSudanMsisdn(input);
}
