/**
 * M-Pesa (Safaricom Daraja) provider — STK Push (Lipa Na M-Pesa Online).
 *
 * The STK Push API sends a PIN-entry prompt to the buyer's phone. They
 * approve, Safaricom pings our webhook, we mark the order paid and issue
 * tickets.
 *
 * Required env vars (sandbox or production both):
 *   MPESA_ENV               "sandbox" | "production"
 *   MPESA_CONSUMER_KEY      from your Daraja app
 *   MPESA_CONSUMER_SECRET   from your Daraja app
 *   MPESA_SHORTCODE         till / paybill number to receive funds
 *   MPESA_PASSKEY           Lipa Na M-Pesa passkey (Safaricom-issued)
 *   MPESA_CALLBACK_URL      public https URL of /api/webhooks/mpesa
 *
 * Sandbox + a test phone are documented at:
 *   https://developer.safaricom.co.ke/Documentation
 *
 * Per-transaction reconciliation: we pass `Order.id` as the
 * `AccountReference` so the callback identifies which order was paid.
 */

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
  return (process.env.MPESA_ENV ?? "sandbox") === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function isConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL
  );
}

/* ────────── Daraja access-token ──────────
 * OAuth client_credentials flow. Tokens last ~1 hour; we cache in-memory
 * and refresh just before expiry so the hot path doesn't auth every time. */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: string | number };
  const ttlMs = (Number(data.expires_in) || 3500) * 1000;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return cachedToken.token;
}

/** STK Push password = base64( shortcode + passkey + timestamp ). */
function stkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/** Daraja timestamp = YYYYMMDDHHmmss (no separators, 24h). */
function darajaTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/** Normalise a phone number to the format Daraja wants (no plus, country
 *  code prefix). "0712345678" / "+254712345678" / "254712345678" all
 *  collapse to "254712345678". */
function normaliseMsisdn(input: string): string {
  let s = input.replace(/\D+/g, "");
  if (s.startsWith("0")) s = "254" + s.slice(1);
  if (!s.startsWith("254")) {
    throw new Error(`Phone number ${input} doesn't look like a Kenyan MSISDN.`);
  }
  return s;
}

export const mpesaProvider: PaymentProvider = {
  id: "MPESA",

  isEnabled() {
    return isConfigured();
  },

  supportsCurrency(currency) {
    return currency.toUpperCase() === "KES";
  },

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    if (!isConfigured()) throw new Error("M-Pesa not configured");
    if (!params.msisdn) {
      return { kind: "needs-input", missing: "msisdn" };
    }
    if (params.amount.currency !== "KES") {
      throw new Error("M-Pesa only accepts KES.");
    }

    const phone     = normaliseMsisdn(params.msisdn);
    const timestamp = darajaTimestamp();
    const shortcode = String(process.env.MPESA_SHORTCODE);
    const passkey   = String(process.env.MPESA_PASSKEY);
    const password  = stkPassword(shortcode, passkey, timestamp);
    // Daraja takes amounts in WHOLE shillings, not cents. Round up to the
    // nearest shilling so we never undercharge.
    const amountKes = Math.ceil(params.amount.amount / 100);

    const token = await getAccessToken();
    const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   "CustomerPayBillOnline",
        Amount:            amountKes,
        PartyA:            phone,         // payer
        PartyB:            shortcode,     // payee (us)
        PhoneNumber:       phone,
        CallBackURL:       process.env.MPESA_CALLBACK_URL,
        AccountReference:  params.orderId.slice(0, 12), // ≤12 chars per Daraja
        TransactionDesc:   "CultureFlow ticket"
      })
    });
    const json = (await res.json()) as {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResponseCode?:      string;
      ResponseDescription?: string;
      errorMessage?:      string;
    };
    if (!res.ok || json.ResponseCode !== "0") {
      throw new Error(
        `M-Pesa STK push failed: ${json.errorMessage || json.ResponseDescription || res.status}`
      );
    }
    if (!json.CheckoutRequestID) {
      throw new Error("M-Pesa returned no CheckoutRequestID.");
    }

    return {
      kind:              "mobile-push",
      paymentId:         "",                                  // filled in by caller
      providerPaymentId: json.CheckoutRequestID,
      message:           `We sent a payment prompt to +${phone}. Approve it on your phone to complete checkout.`,
      expiresAt:         new Date(Date.now() + 60_000).toISOString()  // STK push lives ~60s
    };
  },

  async refund(params: RefundParams): Promise<RefundResult> {
    // M-Pesa B2C reversal is operationally heavy (separate Initiator
    // credentials, security creds, queue URLs). For now we throw so the
    // refund flow falls back to "manually refund and mark resolved".
    // To wire this up: implement TransactionReversal with Initiator,
    // SecurityCredential, and ResultURL/QueueTimeOutURL.
    void params;
    throw new Error(
      "Automatic M-Pesa refund not yet wired. Reverse the transaction in " +
      "the M-Pesa portal, then mark the refund APPROVED so the ticket flips."
    );
  },

  parseWebhook(rawBody): NormalisedEvent | null {
    let payload: unknown;
    try {
      payload = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8"));
    } catch {
      return null;
    }
    // Daraja STK callback shape:
    //   { Body: { stkCallback: {
    //       MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc,
    //       CallbackMetadata?: { Item: [ { Name, Value } ] }
    //   } } }
    const cb = (payload as { Body?: { stkCallback?: Record<string, unknown> } })?.Body
      ?.stkCallback;
    if (!cb) return null;
    const checkoutId = cb["CheckoutRequestID"] as string | undefined;
    const resultCode = cb["ResultCode"] as number | undefined;
    if (!checkoutId) return null;
    const evtId = `mpesa_${checkoutId}_${resultCode}`;

    if (resultCode === 0) {
      const items = ((cb["CallbackMetadata"] as { Item?: Array<{ Name: string; Value: unknown }> })
        ?.Item ?? []) as Array<{ Name: string; Value: unknown }>;
      const amountKes = Number(items.find((i) => i.Name === "Amount")?.Value ?? 0);
      return {
        providerEventId:   evtId,
        type:              "payment.succeeded",
        providerPaymentId: checkoutId,
        amount: { amount: cents(Math.round(amountKes * 100)), currency: "KES" as Currency },
        raw: payload
      } satisfies NormalisedEvent;
    }
    return {
      providerEventId:   evtId,
      type:              "payment.failed",
      providerPaymentId: checkoutId,
      raw: payload
    } satisfies NormalisedEvent;
  }
};

/** Tiny export for the dedicated MSISDN-collection step in checkout. */
export function normaliseKenyanMsisdn(input: string): string {
  return normaliseMsisdn(input);
}
