/**
 * MTN MoMo (Mobile Money) Collections provider — Request to Pay (RTP).
 *
 * The Collections API sends a "Pay X to Y?" prompt to the buyer's MTN
 * Mobile Money handset. They approve, MoMo POSTs to our callback, we
 * mark the order paid and issue tickets.
 *
 * Required env vars:
 *   MOMO_ENV                "sandbox" | "production"
 *   MOMO_targetEnv()         "sandbox" or the live env name MTN issued
 *                           (e.g. "mtnuganda", "mtnrwanda", "mtnsouthsudan")
 *   MOMO_SUBSCRIPTION_KEY   Ocp-Apim-Subscription-Key for Collections
 *   MOMO_API_USER_ID        UUID created via /v1_0/apiuser
 *   MOMO_API_KEY            secret created via /v1_0/apiuser/{id}/apikey
 *   MOMO_CALLBACK_URL       public https URL of /api/webhooks/momo
 *
 * Onboarding docs: https://momodeveloper.mtn.com/.
 *
 * MoMo runs as separate stacks per country (Uganda, Rwanda, Cameroon,
 * Ghana, Côte d'Ivoire, South Sudan, etc.). Set `MOMO_targetEnv()` to the
 * one you've contracted for. The base URL stays the same; the header
 * `X-Target-Environment` does the routing.
 */

import { randomUUID } from "node:crypto";
import { cents, type Currency } from "@/lib/money";
import type {
  PaymentProvider,
  PaymentInitiation,
  ChargeParams,
  RefundParams,
  RefundResult,
  NormalisedEvent
} from "./types";

function baseUrl(): string {
  return (process.env.MOMO_ENV ?? "sandbox") === "production"
    ? "https://proxy.momoapi.mtn.com"
    : "https://sandbox.momodeveloper.mtn.com";
}

function isConfigured(): boolean {
  return Boolean(
    process.env.MOMO_SUBSCRIPTION_KEY &&
      process.env.MOMO_API_USER_ID &&
      process.env.MOMO_API_KEY &&
      process.env.MOMO_CALLBACK_URL
  );
}

function targetEnv(): string {
  return process.env.MOMO_TARGET_ENV ?? "sandbox";
}

/* ────────── Auth (OAuth2 client_credentials) ────────── */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const auth = Buffer.from(
    `${process.env.MOMO_API_USER_ID}:${process.env.MOMO_API_KEY}`
  ).toString("base64");
  const res = await fetch(`${baseUrl()}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": String(process.env.MOMO_SUBSCRIPTION_KEY)
    }
  });
  if (!res.ok) throw new Error(`MoMo auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3500) * 1000
  };
  return cachedToken.token;
}

/** Strip non-digits and chop a leading "+". MoMo accepts E.164 without "+". */
function normaliseMomoMsisdn(input: string): string {
  const s = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (s.length < 9) throw new Error(`Phone number ${input} looks too short for MoMo.`);
  return s;
}

/* MoMo currencies, by env. The `MOMO_targetEnv()` you contract for
 *  determines which currency you can collect in. */
const TARGET_CURRENCIES: Record<string, string[]> = {
  sandbox:        ["EUR"], // sandbox always settles in EUR
  mtnuganda:      ["UGX"],
  mtnrwanda:      ["RWF"],
  mtnghana:       ["GHS"],
  mtncameroon:    ["XAF"],
  mtncoteivoire:  ["XOF"],
  mtnsouthsudan:  ["SSP"]
};

export const momoProvider: PaymentProvider = {
  id: "MOMO",

  isEnabled() {
    return isConfigured();
  },

  supportsCurrency(currency) {
    const allowed = TARGET_CURRENCIES[targetEnv()] ?? [];
    return allowed.includes(currency.toUpperCase());
  },

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    if (!isConfigured()) throw new Error("MoMo not configured");
    if (!params.msisdn) {
      return { kind: "needs-input", missing: "msisdn" };
    }
    if (!momoProvider.supportsCurrency(params.amount.currency)) {
      throw new Error(
        `MoMo target env ${targetEnv()} doesn't accept ${params.amount.currency}.`
      );
    }

    const referenceId = randomUUID(); // X-Reference-Id header — also our payment id
    const phone       = normaliseMomoMsisdn(params.msisdn);
    const token       = await getAccessToken();

    // Amount in major units (MoMo expects "10.00", not "1000").
    const amountMajor = (params.amount.amount / 100).toFixed(2);

    const res = await fetch(`${baseUrl()}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization:                `Bearer ${token}`,
        "Content-Type":               "application/json",
        "X-Reference-Id":             referenceId,
        "X-Target-Environment":       targetEnv(),
        "X-Callback-Url":             String(process.env.MOMO_CALLBACK_URL),
        "Ocp-Apim-Subscription-Key":  String(process.env.MOMO_SUBSCRIPTION_KEY)
      },
      body: JSON.stringify({
        amount:    amountMajor,
        currency:  params.amount.currency,
        externalId: params.orderId,
        payer: { partyIdType: "MSISDN", partyId: phone },
        payerMessage: `CultureFlow order ${params.orderId.slice(0, 8).toUpperCase()}`.slice(0, 160),
        payeeNote:    `CultureFlow order ${params.orderId.slice(0, 8).toUpperCase()}`.slice(0, 160)
      })
    });
    if (!res.ok) {
      throw new Error(`MoMo request-to-pay failed: ${res.status} ${await res.text()}`);
    }
    return {
      kind:              "mobile-push",
      paymentId:         "",
      providerPaymentId: referenceId,
      message:           `We sent a Mobile Money request to +${phone}. Approve it on your handset to complete checkout.`,
      expiresAt:         new Date(Date.now() + 90_000).toISOString()
    };
  },

  async refund(params: RefundParams): Promise<RefundResult> {
    // MoMo Disbursements API supports refunds via `transfer` from a
    // disbursement account. Wiring it up requires a separate
    // Disbursements subscription + API user. Stub for now.
    void params;
    throw new Error(
      "Automatic MoMo refund not yet wired. Reverse the transaction in " +
      "the MoMo portal, then mark the refund APPROVED so the ticket flips."
    );
  },

  parseWebhook(rawBody): NormalisedEvent | null {
    let payload: unknown;
    try {
      payload = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8"));
    } catch {
      return null;
    }
    // Callback shape:
    //   { externalId, amount, currency, payer, payerMessage, payeeNote,
    //     status: "SUCCESSFUL" | "FAILED", reason, financialTransactionId,
    //     referenceId? }
    const p = payload as Record<string, unknown>;
    const referenceId = (p.referenceId ?? p.externalId) as string | undefined;
    const status      = p.status as string | undefined;
    if (!referenceId || !status) return null;
    const amountMajor = Number(p.amount ?? 0);
    const currency    = String(p.currency ?? "EUR").toUpperCase() as Currency;

    if (status === "SUCCESSFUL") {
      return {
        providerEventId:   `momo_${referenceId}`,
        type:              "payment.succeeded",
        providerPaymentId: referenceId,
        amount: { amount: cents(Math.round(amountMajor * 100)), currency },
        raw: payload
      } satisfies NormalisedEvent;
    }
    return {
      providerEventId:   `momo_${referenceId}_failed`,
      type:              "payment.failed",
      providerPaymentId: referenceId,
      raw: payload
    } satisfies NormalisedEvent;
  }
};

export function normaliseMomoPhone(input: string): string {
  return normaliseMomoMsisdn(input);
}
