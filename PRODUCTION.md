# Production deployment checklist

A pragmatic, step-by-step guide to taking CultureFlow from `npm run dev`
to a live, public deployment. Optimised for clarity over completeness —
stop here when something is "good enough" rather than chasing perfection.

---

## 0 — Pick a host

| Host                  | Pros                                                  | Notes                                                                 |
|-----------------------|-------------------------------------------------------|-----------------------------------------------------------------------|
| **Vercel**            | Zero-config Next.js, edge functions, free TLS         | Best fit. Pricing scales with bandwidth + functions.                  |
| **Fly.io / Railway**  | Full Node runtime, native Postgres add-on             | Pair with Neon / Supabase for DB. `output: "standalone"` ships smaller. |
| **Self-hosted (VM)**  | Full control                                          | You own TLS, log shipping, healthchecks, autorestart (systemd / PM2). |

The repo's `next.config.mjs` sets `output: "standalone"` so VM/Docker
deploys ship a tiny `.next/standalone/` tree (~10× smaller than the
full `.next/`).

---

## 1 — Provision infrastructure

- [ ] **Postgres 14+** with at least one connection slot per replica + 5 spare. Set `DATABASE_URL`. Use a hosted DB (Neon, Supabase, Railway, RDS) before self-hosting.
- [ ] **Domain + TLS**. Production refuses to boot if `APP_URL` / `NEXTAUTH_URL` aren't `https://` (env-guard in `src/lib/env.ts`).
- [ ] **(Optional) Redis** for distributed rate-limiting. Set `RATE_LIMIT_DRIVER=redis` + `REDIS_URL` once you go multi-replica. Until then in-memory limiting is per-process and undercounts under load.
- [ ] **Object storage** (Cloudflare R2 / S3 / Cloudinary) for organizer-uploaded banners. The placeholder uploads endpoint accepts files but doesn't persist them yet — wire your provider in `src/app/api/uploads/route.ts`.

---

## 2 — Configure environment

Copy `.env.example` to `.env`, then walk every section:

### Required (boot fails without these)
- [ ] `DATABASE_URL` — Postgres connection string with TLS (`?sslmode=require` for hosted DBs).
- [ ] `NEXTAUTH_SECRET` — 32+ bytes. Generate: `openssl rand -base64 32`.
- [ ] `NEXTAUTH_URL` and `APP_URL` — both `https://`. The env-guard rejects HTTP in production.
- [ ] `ADMIN_EMAIL` — first signup matching this gets `role=ADMIN`.

### Feature flags
- [ ] `DEMO_CHECKOUT="false"` — production env-guard refuses to boot if true.
- [ ] `ENABLE_PAID_EVENTS="true"` — at least one payment rail must be configured below.
- [ ] `PLATFORM_FEE_PERCENT` — your commission (default 5).
- [ ] `CRON_SECRET` — random hex; required header for `/api/cron/sweep-reservations`. Generate: `openssl rand -hex 32`.

### Payment rails — at least one
- [ ] **Stripe** (recommended baseline): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- [ ] **M-Pesa Daraja** (KES): `MPESA_*` keys + register the webhook URL `https://<your-domain>/api/webhooks/mpesa` on Safaricom's portal.
- [ ] **MTN MoMo Collections** (UGX, RWF, GHS, etc.): `MOMO_*` keys + webhook URL.
- [ ] **m-Gurush** (SSP): contact merchant team for credentials, then set `MGURUSH_*`.

### Operations
- [ ] `LOG_LEVEL="info"` — bump to `"warn"` for chatty environments.
- [ ] `RATE_LIMIT_DRIVER="memory"` — switch to `"redis"` + `REDIS_URL` once horizontally scaled.

---

## 3 — Database setup

```bash
# Apply migrations (NEVER use `db:push` in production)
npm run db:deploy

# Seed sample data ONLY in non-production stages
NODE_ENV=development npm run db:seed
```

If you change image filenames in `/public/community/`, run the
migration script to update existing event banner URLs in the DB:

```bash
node scripts/migrate-event-banners.mjs --dry-run   # preview
node scripts/migrate-event-banners.mjs             # apply
```

---

## 4 — Schedule the cron jobs

Two periodic tasks must run:

1. **`/api/cron/sweep-reservations`** (every 5 min) — releases seats whose
   12-min cart hold expired. Without it, oversold zombie holds accumulate.
2. **`/api/cron/expire-events`** (every hour) — flips events from
   `PUBLISHED → PAST` once `endsAt < now`. Public listings filter on
   `status = PUBLISHED`, so this is what makes finished events disappear
   from `/browse`, `/events/category/*`, the homepage, etc.

| Host       | How                                                                           |
|------------|-------------------------------------------------------------------------------|
| Vercel     | Already wired in `vercel.json`. Vercel Cron auto-attaches `Authorization: Bearer $CRON_SECRET` when the env var is set. |
| Fly.io     | A `fly.toml` `[deploy]` `release_command` triggered by an external scheduler. |
| Self-host  | `crontab -e`: <br>`*/5 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/sweep-reservations` <br>`0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/expire-events` |

---

## 5 — Build + verify

```bash
npm ci                    # reproducible install
npm run build             # type-check + Next prod build
npm test                  # 63 unit tests
```

Then smoke-test the deployed app:

- [ ] `GET /api/health` returns `200 {"status":"ok"}`.
- [ ] Sign-up + sign-in flow works end-to-end.
- [ ] At least one paid checkout completes (use Stripe test card `4242 4242 4242 4242`).
- [ ] Webhook delivery: trigger a test webhook from each payment rail's dashboard; verify the order moves to PAID and a ticket is issued.
- [ ] Print a ticket from `/tickets/[id]` and verify the brand bar + QR survive.

---

## 6 — Security hardening (already in place — verify)

- ✅ CSP with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
- ✅ HSTS preload-ready (`max-age=2y`, includeSubDomains, preload).
- ✅ Auth via NextAuth + Prisma adapter; bcryptjs password hashing.
- ✅ Rate-limiting on every spam-prone API route.
- ✅ Webhook signatures verified for Stripe, M-Pesa, MoMo, m-Gurush.
- ✅ Idempotency on payment finalisation via `ProviderEvent` table.
- ✅ Prisma parameterised queries — no string-built SQL anywhere.

---

## 7 — Observability (recommended, not blocking)

Logger emits one JSON object per line via `src/lib/logger.ts`. Pipe
stdout into your log aggregator of choice:

- **Datadog / Honeycomb / Loki**: tail the container stdout — schema is `{ level, msg, ts, ...ctx }`.
- **Sentry** for exception capture: install `@sentry/nextjs` and wrap `src/app/error.tsx`.
- **Uptime probe**: hit `/api/health` every 30s.

---

## 8 — Image attribution (legal)

Default community photos are sourced from Wikimedia Commons under CC-BY,
CC-BY-SA, or public domain. CC-BY licences require visible attribution.

A `/credits` page renders `public/community/ATTRIBUTION.md` automatically
once you re-run `scripts/swap-commons-photos.mjs`. Either keep that page
linked in the footer OR replace the CC-BY photos with public-domain
alternatives or first-party shots (drop a JPG with the same name into
`/public/community/`).

---

## 9 — Day-2 maintenance

| Cadence    | Task                                                          |
|------------|---------------------------------------------------------------|
| Weekly     | Review failed webhooks (`ProviderEvent` rows with `status='ERROR'`). |
| Weekly     | Sweep dust reservations (cron should handle this; verify).    |
| Monthly    | Rotate `CRON_SECRET` and `NEXTAUTH_SECRET`.                   |
| Monthly    | `npm outdated` + apply patch upgrades.                        |
| Quarterly  | Re-run `npm test`; check for newly skipped/flaky tests.       |

---

## What's deliberately out of scope

- **Email delivery**: ticket receipts call a stubbed `sendMail()`. Wire `EMAIL_SERVER` and a templating layer (Resend / SendGrid / Postmark) before going live.
- **OAuth providers**: only Google is scaffolded. Apple / Facebook would need separate provider configs.
- **Admin panel**: lightweight; no bulk operations, no audit log UI.
- **i18n**: copy is English-only.
