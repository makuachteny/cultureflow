# Accounts to create / credentials to obtain

Everything below is required to take real money for **paid events**.
Free events work without any of these — the platform issues tickets
immediately for $0 orders.

For each rail, sandbox credentials are enough to test the integration
end to end. Move to production credentials when you're ready to go
live in a given market.

---

## 1. Database — Postgres

**Pick one** managed Postgres host. They're all free at hobby scale.

| Host | Free tier | URL |
|------|-----------|-----|
| **Neon** (recommended) | 500MB, branching for previews | <https://neon.tech> |
| Supabase | 500MB + auth dashboard if you need it | <https://supabase.com> |
| Render | 256MB | <https://render.com> |

Set: `DATABASE_URL`

---

## 2. Hosting — Vercel (recommended) or any Docker host

**Vercel** — one-click deploy from GitHub, auto HTTPS, automatic CDN.
Free tier is enough for the early period. <https://vercel.com>.

Alternatives that work without changes: Render, Fly.io, Railway, AWS
ECS / Lightsail. The repo ships a `Dockerfile` that runs `prisma migrate
deploy` on boot.

Set: `NEXTAUTH_URL`, `APP_URL` (must be `https://…` in production)

---

## 3. Stripe — cards, Apple Pay, Google Pay, debit, anywhere worldwide

This is the one rail you almost certainly want. Stripe handles credit
+ debit cards (Visa / Mastercard / Amex / Discover / Maestro / Mada),
Apple Pay, Google Pay, and Link in one integration.

### Getting credentials

1. Sign up at <https://dashboard.stripe.com/register>.
2. **Activate your account** — Stripe needs your business details
   (legal name, address, tax ID, bank account) before live keys work.
   Test keys work immediately; you can build the whole integration in
   sandbox first.
3. **API keys** — Dashboard → Developers → API keys. Copy:
   - `STRIPE_SECRET_KEY`     (`sk_test_…` for sandbox, `sk_live_…` for production)
   - `STRIPE_PUBLISHABLE_KEY` (`pk_test_…` / `pk_live_…`)
4. **Webhook endpoint** — Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://yourdomain/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `checkout.session.async_payment_failed`, `charge.refunded`
   - Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`
5. **Stripe Connect** (organizer payouts):
   - Dashboard → Settings → Connect → Get started
   - Pick **Express accounts** (the platform-shaped flow we wired up).
   - No extra env var — the secret key already authenticates the Connect API.

### Set in env

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_PUBLISHABLE_KEY=pk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
ENABLE_PAID_EVENTS=true
```

---

## 4. M-Pesa (Safaricom Daraja) — KES via STK Push

Only relevant for transactions priced (or routed) in **KES**. Live
credentials need a Safaricom merchant relationship; sandbox is open.

### Getting credentials

1. Sign up at <https://developer.safaricom.co.ke/>.
2. Create a new app → enable **Lipa Na M-Pesa Online (STK Push)**.
3. Copy from the app dashboard:
   - **Consumer Key**       → `MPESA_CONSUMER_KEY`
   - **Consumer Secret**    → `MPESA_CONSUMER_SECRET`
   - **Lipa Na M-Pesa shortcode** (test: `174379`) → `MPESA_SHORTCODE`
   - **Lipa Na M-Pesa passkey** → `MPESA_PASSKEY`
4. **Production**: contact Safaricom Pay Bill / Till sales to register a
   live shortcode. Live keys are issued once the merchant agreement is
   signed. Approval takes ~1–3 weeks.
5. **Webhook URL** (set in your Daraja app):
   - `https://yourdomain/api/webhooks/mpesa?t=<MPESA_CALLBACK_TOKEN>`
   - The `?t=` query is our shared-secret check — generate with
     `openssl rand -hex 32` and put both in `MPESA_CALLBACK_URL`
     (sent in every STK push) and `MPESA_CALLBACK_TOKEN` (validated
     server-side).

### Set in env

```
MPESA_ENV=sandbox          # or "production"
MPESA_CONSUMER_KEY=…
MPESA_CONSUMER_SECRET=…
MPESA_SHORTCODE=174379
MPESA_PASSKEY=…
MPESA_CALLBACK_URL=https://yourdomain/api/webhooks/mpesa?t=…
MPESA_CALLBACK_TOKEN=…
```

---

## 5. MTN MoMo Collections — UGX, RWF, GHS, XAF, XOF, SSP

Only relevant for events priced in MTN-MoMo currencies. Sandbox is open;
live needs MTN partnership per country.

### Getting credentials

1. Sign up at <https://momodeveloper.mtn.com/>.
2. Subscribe to the **Collections** product → copy the
   **Subscription Key** → `MOMO_SUBSCRIPTION_KEY`.
3. Provision an **API user** (one-time setup):

   ```bash
   curl -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser \
     -H "Ocp-Apim-Subscription-Key: <SUB_KEY>" \
     -H "X-Reference-Id: <generate a UUID>" \
     -d '{"providerCallbackHost": "yourdomain"}'
   ```

   Save the UUID you generated — that's `MOMO_API_USER_ID`.
4. Get the API key for that user:

   ```bash
   curl -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/<MOMO_API_USER_ID>/apikey \
     -H "Ocp-Apim-Subscription-Key: <SUB_KEY>"
   ```

   The `apiKey` in the response → `MOMO_API_KEY`.
5. **Production**: contact MTN per country (Uganda, Rwanda, Ghana,
   Cameroon, Côte d'Ivoire, South Sudan, etc.). They'll issue a
   `MOMO_TARGET_ENV` value (e.g. `mtnuganda`) plus production
   subscription key + API user.

### Set in env

```
MOMO_ENV=sandbox            # or "production"
MOMO_TARGET_ENV=sandbox     # or "mtnuganda" / "mtnsouthsudan" / ...
MOMO_SUBSCRIPTION_KEY=…
MOMO_API_USER_ID=…
MOMO_API_KEY=…
MOMO_CALLBACK_URL=https://yourdomain/api/webhooks/momo?t=…
MOMO_CALLBACK_TOKEN=…       # see M-Pesa note above
```

---

## 6. m-Gurush — South Sudanese Pound (SSP)

m-Gurush has no public developer portal. To go live:

1. **Contact m-Gurush merchant onboarding** — Trinity Technologies.
   They'll send you a merchant agreement, sandbox credentials, and the
   API specification PDF.
2. Once you have the spec, finish the HTTP shape in
   `src/lib/payments/mgurush.ts` (it's left as a documented stub since
   we didn't want to ship guesses).

### Set in env (placeholders — finalise once you have the spec)

```
MGURUSH_ENV=sandbox
MGURUSH_BASE_URL=https://api.mgurush.example/v1
MGURUSH_MERCHANT_ID=…
MGURUSH_API_KEY=…
MGURUSH_WEBHOOK_SECRET=…
MGURUSH_CALLBACK_URL=https://yourdomain/api/webhooks/mgurush
```

---

## 7. Cron — periodic reservation sweep

Any cron service that can hit an HTTP endpoint every 1–5 min works.

| Service | Where |
|---------|-------|
| **Vercel Cron** (free if hosted on Vercel) | `vercel.json` `crons` array |
| GitHub Actions schedule | `.github/workflows/cron.yml` |
| Render Cron | dashboard |
| External: cron-job.org / EasyCron | free tiers exist |

**Endpoint**: `POST https://yourdomain/api/cron/sweep-reservations`
**Header**: `Authorization: Bearer <CRON_SECRET>`

Generate the secret: `openssl rand -hex 32` → set `CRON_SECRET`.

---

## 8. Email transport (for receipts) — recommended before launch

Pick one transactional-email provider. We don't ship a default one.

| Provider | Free tier |
|----------|-----------|
| **Resend** (recommended) | 3000 emails/mo |
| Postmark | 100 emails/mo |
| SendGrid | 100/day |
| Mailgun | 100/day for sandbox |

Set `EMAIL_SERVER` (SMTP URL) and `EMAIL_FROM` (display address).

---

## 9. Monitoring — recommended

| Tool | Purpose |
|------|---------|
| **Sentry** | error tracking — catches every rail-side blow-up |
| **Better Stack / Datadog** | uptime + log aggregation |

Not strictly required to launch.

---

## What you DON'T need to set up

- **FX rates** — uses <https://exchangerate.host> (no API key, free).
  Override with `FX_PROVIDER_URL` if you want a paid feed later.
- **Geo detection** — Vercel Edge / Cloudflare ship country headers
  automatically. Locally we fall back to the Accept-Language header.
- **CDN / image optimisation** — Vercel does this; on Docker hosts the
  Next.js image loader handles it.

---

## Order of operations

1. **Database first** — get Postgres + run `npx prisma migrate deploy`.
2. **Stripe** — even if you only care about Africa, Stripe is the card
   fallback for buyers without mobile money.
3. **Cron secret + sweep** — set up the periodic reservation sweep so
   abandoned carts don't lock seats.
4. **One mobile-money rail at a time** — start with the country you're
   launching in. Sandbox first; real money second.
5. **Email + Sentry** when traffic justifies it.
