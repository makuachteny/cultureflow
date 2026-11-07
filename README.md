<p align="center">
  <img src="public/logo-horizontal.svg" alt="CultureFlow" height="72">
</p>

# CultureFlow

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-payments-635BFF?logo=stripe&logoColor=white)

The events and community platform for every culture and community — discover, host, and celebrate gatherings anywhere in the world: cultural festivals, faith services, weddings, concerts, meetups, and family days. Modern discovery and ticketing, designed to work on mobile and low-bandwidth connections, with card and mobile-money payments so it works from Lagos to London.

This repository contains the full web application: Next.js 14 (App Router) + Prisma + Postgres, with NextAuth authentication, Stripe payments (test mode by default), and a community layer (profiles, follows, likes, event comments, admin moderation).

### 🔗 Live demo: **[cultureflow-demo.vercel.app](https://cultureflow-demo.vercel.app)**

Sign in with any of the seeded accounts, for example **`alek@cultureflow.example` / `password123`** (organizer) or **`admin@cultureflow.example` / `admin1234`** (admin). The full list is under [Sample logins](#sample-logins-from-the-seed-script).

> The demo runs in `DEMO_DB=pglite` mode (see [Demo mode](#demo-mode--no-database-required)): an embedded, pre-seeded database with no external Postgres. You can browse, sign in, create events and register for free events, but **changes reset periodically**. Payments are disabled.

![CultureFlow home page](docs/screenshots/home.png)

---

## Brand

The logo is a long-horned cow — a symbol of gathering and shared wealth across many cultures — drawn in flat colour with sharp edges. Every variant (lockups, mark, wordmark, app icons, favicon, social card) is generated from code. See the [brand guide](docs/brand.md).

## Screenshots

Screenshots are from the [live demo](https://cultureflow-demo.vercel.app) running on the seed data.

### Discover

| Browse events | Map view |
|---|---|
| ![Browse events in Juba with category, format and price filters](docs/screenshots/browse.png) | ![Map view with a filterable event list beside the map](docs/screenshots/browse-map.png) |

| Event detail | Organizer profile |
|---|---|
| ![Event page with host card and ticket selector](docs/screenshots/event-detail.png) | ![Public organizer profile with upcoming and past events](docs/screenshots/organizer-profile.png) |

### Checkout & sign-in

| Checkout | Sign in |
|---|---|
| ![Checkout modal with contact info, ticket holder and order summary](docs/screenshots/checkout.png) | ![Email-first sign-in with Apple, Google and Facebook options](docs/screenshots/sign-in.png) |

### Mobile

<p>
  <img src="docs/screenshots/mobile-home.png" alt="Home page on mobile" width="280">
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-event.png" alt="Event page on mobile with sticky reserve bar" width="280">
</p>

### Organizer dashboard

| Dashboard | Event builder |
|---|---|
| ![Organizer dashboard with events, tickets sold, revenue and followers](docs/screenshots/dashboard.png) | ![Three-step event builder: page, tickets, publish](docs/screenshots/event-builder.png) |

| Event management |
|---|
| ![Per-event view with sales, revenue, comments and attendee list](docs/screenshots/dashboard-event.png) |

### Admin console

![Admin console with platform KPIs and user moderation](docs/screenshots/admin.png)

---

## Stack

- **Next.js 14** (App Router, server components, server actions)
- **TypeScript**
- **Prisma** ORM against **PostgreSQL**
- **NextAuth v5** (credentials + optional Google OAuth)
- **Stripe** for payments (test-ready)
- **Tailwind CSS** with a flat, bold brand palette (square corners, no gradients)
- **Vitest** for unit tests
- **Docker** + `docker-compose` for local development
- Designed to deploy to **Vercel + Neon/Supabase** (or any Docker host)

## Project structure

```text
cultureflow/
├── prisma/
│   ├── schema.prisma        # Full data model
│   ├── migrations/          # Versioned migrations
│   └── seed.ts              # Sample users, events, tickets
├── src/
│   ├── middleware.ts        # Edge auth gate for /dashboard, /admin, /account, etc.
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Home
│   │   ├── browse/                      # Discovery + filters
│   │   │   └── map/                     # Map view
│   │   ├── events/[slug]/               # Event detail (ticket selector, comments)
│   │   ├── events/new/                  # Create event (marketing → dashboard builder)
│   │   ├── tickets/                     # My tickets + ticket detail (QR)
│   │   ├── dashboard/                   # Organizer dashboard
│   │   ├── admin/                       # Admin moderation console
│   │   ├── account/                     # User account settings
│   │   ├── liked/ following/ interests/ # Attendee surfaces
│   │   ├── organizer/[id]/              # Public organizer calendar + /contact
│   │   ├── profile/[userId]/            # Public profile
│   │   ├── contact/                     # Site contact form
│   │   ├── sign-in, sign-up             # Auth pages
│   │   └── api/                         # Route handlers (auth, events, tickets, etc.)
│   ├── components/                      # Header, Footer, EventCard, EventForm, etc.
│   └── lib/                             # db, auth, stripe, validators, utils, logger
├── tests/                               # Vitest smoke tests
├── Dockerfile
├── docker-compose.yml
├── .env                     # NEVER commit; .gitignore excludes it
├── .env.example             # Safe template for new deploys
└── README.md
```

## Data model (high level)

- `User` with `Role` (ATTENDEE / ORGANIZER / ADMIN), `UserStatus`, and an optional free-text community / heritage label
- `Event` + `TicketTier` + `Ticket` (events can be open to everyone or limited to named communities)
- `Order` + `Payment` + `StripeEvent` (idempotency)
- `Comment`, `Follow`, `Like` (community graph)
- `ContactMessage`, `OrganizerMessage` (inbound support + DMs)
- `ModerationLog` (admin audit trail)

See `prisma/schema.prisma` for the full definition.

---

## Quick start — local development

### Prerequisites

- **Node.js ≥ 18.17**
- **npm** (or pnpm/yarn — adjust commands)
- **Docker** + **Docker Compose** (for local Postgres via `docker-compose.yml`)

### 1. Clone & install

```bash
git clone <your-remote-url> cultureflow
cd cultureflow
npm install
```

### 2. Configure environment

Copy the template, then fill in real values:

```bash
cp .env.example .env
openssl rand -base64 32        # paste this into NEXTAUTH_SECRET
```

`.env` is gitignored. Production requires **https** for `NEXTAUTH_URL` / `APP_URL` — the env module throws at boot otherwise.

### 3. Start Postgres

```bash
docker compose up -d db
```

…or point `DATABASE_URL` at any Postgres you already run.

### 4. Migrate the database and seed sample data

```bash
npx prisma migrate deploy   # applies the versioned migrations under prisma/migrations
npm run db:seed              # optional — sample users, events, tickets
```

### 5. Run the app

```bash
npm run dev
# → http://localhost:3000
```

### Sample logins (from the seed script)

| Role      | Email                         | Password      |
|-----------|-------------------------------|---------------|
| Admin     | `admin@cultureflow.example`   | `admin1234`   |
| Organizer | `alek@cultureflow.example`    | `password123` |
| Organizer | `mary@cultureflow.example`    | `password123` |
| Attendee  | `james@cultureflow.example`   | `password123` |
| Attendee  | `ayen@cultureflow.example`    | `password123` |

More organizers (`peter@`, `grace@`, `nyawal@`, `lado@`, `taban@`) and attendees (`daniel@`, `rebecca@`) use `password123` too. The seed covers events in New York, London, Toronto, Lagos, Nairobi, Mumbai, São Paulo, Mexico City, Paris, Seoul, Sydney, Juba and online — Diwali, Lunar New Year, Día de los Muertos, Juneteenth, Eid, Nowruz, Holi and more.

### Running in Docker locally

```bash
docker compose up --build
# app at http://localhost:3000 · Postgres at localhost:5432
```

---

## Core flows

- **Browse** — `/browse` with filters for keyword, city, category, price, type, date, sort, and grid/list toggle. Map view at `/browse/map`.
- **Event detail** — `/events/[slug]` with sticky ticket selector, likes, and comments.
- **Create event** — `/events/new` marketing landing → `/dashboard/events/new` builder (auto-promotes attendees to ORGANIZER on first publish).
- **Checkout** — POST `/api/checkout` handles free + paid events across multiple rails (Stripe, M-Pesa, MTN MoMo, m-Gurush). Reservations hold seats with a 12-min TTL while the buyer is in the payment flow. `DEMO_CHECKOUT=true` simulates paid flow without any rail.
- **Webhooks** — `/api/webhooks/stripe`, `/api/webhooks/mpesa`, `/api/webhooks/momo`, `/api/webhooks/mgurush`. All finalise via the shared `ProviderEvent` dedupe + `finaliseProviderEvent` issuer.
- **Payouts** — `/dashboard/payouts` (organizer onboards Stripe Connect for cards + a mobile-money till for KES/UGX/SSP/etc.).
- **Promo codes** — `PromoCode` model + checkout integration. Percent or fixed-cents, scoped per-event or global, with use caps and per-user caps.
- **My tickets** — `/tickets` lists issued tickets; `/tickets/[id]` shows a QR code + 6-character fallback code.
- **Organizer dashboard** — `/dashboard` + `/dashboard/events/[id]` (attendee list, sales, revenue).
- **Organizer profile** — `/organizer/[id]` public calendar + direct-to-organizer contact at `/organizer/[id]/contact`.
- **Admin** — `/admin` (user suspend/unsuspend, event publish/unlist/feature, comment hide, moderation log).
- **GDPR** — `/account/personal-data` streams a JSON archive of everything the app holds for the signed-in user.

## Payment rails + multi-currency

**Buyers pay in their own currency.** The organizer prices a tier in
whatever currency they want; at checkout time the server detects the
buyer's country (via `x-vercel-ip-country` / `cf-ipcountry` / the
Accept-Language header) and FX-converts the order total into the buyer's
local currency before passing it to the payment rail. The Order row
stays in organizer currency for revenue reporting; the Payment row
records the buyer-side amount + currency.

FX rates come from <https://exchangerate.host> (free, no key) with a
6-hour in-process cache and a hardcoded fallback table so checkout
never breaks if the upstream is down. Override with `FX_PROVIDER_URL`
to point at a paid feed (Open Exchange Rates, Fixer, etc.).

Cards work everywhere — Stripe Checkout accepts every credit + debit
card brand it supports (Visa / Mastercard / Amex / Discover / Maestro
/ Mada / Cartes Bancaires) plus Apple Pay, Google Pay, and Link.

> **Setup**: see [`docs/accounts-to-create.md`](docs/accounts-to-create.md)
> for every account you need (Stripe, M-Pesa Daraja, MTN MoMo, m-Gurush,
> hosting, cron, email).

CultureFlow routes each order to the right rail based on the BUYER's currency. Cards work everywhere; the mobile-money rails cover East Africa today, and new regional rails plug in behind the same interface.
The `pickProvider()` policy in `src/lib/payments/router.ts`:

| Currency       | Default rail            | Fallback     |
|----------------|-------------------------|--------------|
| KES, TZS       | M-Pesa (Daraja STK Push) | Stripe       |
| UGX, RWF       | MTN MoMo (Request to Pay) | Stripe      |
| SSP            | m-Gurush                 | MoMo, Stripe |
| USD/GBP/EUR/CAD/AUD/EGP/SDG | Stripe       | —            |

Buyers can override the rail at checkout (e.g. "use my card even though
I'm in Kenya"). Each rail implements the same `PaymentProvider` interface
in `src/lib/payments/types.ts`, so swapping a provider is a one-file change.

**Setup per rail** (env vars documented in `.env.example`):

- **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **M-Pesa** — `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`. Get from <https://developer.safaricom.co.ke/>.
- **MTN MoMo** — `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER_ID`, `MOMO_API_KEY`, `MOMO_TARGET_ENV`, `MOMO_CALLBACK_URL`. Get from <https://momodeveloper.mtn.com/>.
- **m-Gurush** — `MGURUSH_BASE_URL`, `MGURUSH_MERCHANT_ID`, `MGURUSH_API_KEY`, `MGURUSH_WEBHOOK_SECRET`, `MGURUSH_CALLBACK_URL`. Issued at merchant onboarding.

**Connect / payouts**: organizers go to `/dashboard/payouts` to (a) onboard
their Stripe Connect Express account so card payments land in their balance,
and (b) register a mobile-money till/merchant code per rail. The platform
takes `PLATFORM_FEE_PERCENT` of every paid order — snapshotted on each
order at creation so historical reporting stays correct.

## API routes

| Method | Path                                       | Purpose                                   |
|--------|--------------------------------------------|-------------------------------------------|
| POST   | `/api/register`                            | Create account                            |
| POST   | `/api/events`                              | Create event (auth)                       |
| PATCH  | `/api/events/[id]`                         | Edit own event                            |
| DELETE | `/api/events/[id]`                         | Delete own event (or admin)               |
| POST   | `/api/events/[id]/comments`                | Post comment                              |
| POST   | `/api/follows`                             | Follow or unfollow a user                 |
| POST   | `/api/likes`                               | Like or unlike an event                   |
| POST   | `/api/checkout`                            | Start order — every payment rail          |
| GET    | `/api/checkout/status`                     | Poll order/payment status (mobile push)   |
| POST   | `/api/webhooks/stripe`                     | Stripe webhook                            |
| POST   | `/api/webhooks/mpesa`                      | M-Pesa Daraja STK callback                |
| POST   | `/api/webhooks/momo`                       | MTN MoMo Collections callback             |
| POST   | `/api/webhooks/mgurush`                    | m-Gurush callback                         |
| GET/POST | `/api/connect/stripe`                    | Stripe Connect onboarding (organizer)     |
| GET/POST | `/api/connect/mobile-money`              | Mobile-money payout account upsert        |
| POST   | `/api/refunds/[id]`                        | Resolve a RefundRequest (organizer/admin) |
| GET/POST | `/api/cron/sweep-reservations`           | Periodic TTL sweep                        |
| POST   | `/api/tickets/check-in`                    | Scanner check-in                          |
| POST   | `/api/tickets/[id]/refund-request`         | Request a refund                          |
| POST   | `/api/tickets/[id]/transfer`               | Transfer a ticket                         |
| POST   | `/api/waitlist`                            | Join a sold-out event's waitlist          |
| POST   | `/api/subscribe`                           | Newsletter subscribe                      |
| POST   | `/api/uploads`                             | Image upload (magic-byte validated)       |
| GET    | `/api/account/export`                      | GDPR data export (JSON)                   |
| POST   | `/api/admin/action`                        | Admin-only moderation                     |
| GET/POST | `/api/auth/[...nextauth]`                | NextAuth                                  |
| GET    | `/api/health`                              | Healthcheck (LB probes)                   |

---

## Tests

```bash
npm test
```

Covers the zod validators, rate-limit buckets, and auth-helper guards. Expand with Playwright end-to-end tests (sign up → create event → buy ticket → comment) before production.

## Security notes

- **Headers** — full CSP, HSTS (prod), X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Passwords** hashed with **bcrypt** (cost 10) + per-email brute-force rate limit + constant-time responses.
- **Input** validated with **Zod** at every API entry point.
- **RBAC** enforced in `middleware.ts` and at each protected route.
- **Stripe webhook** signatures verified; events deduped on `event.id`.
- **Uploads** pass a magic-byte sniff that rejects mis-typed or SVG payloads.
- **Open redirects** blocked by `safeCallback()` on `?callbackUrl=` params.
- **Env safety** — `src/lib/env.ts` refuses to boot production if `DEMO_CHECKOUT=true`, `NEXTAUTH_SECRET` is short, or URLs aren't `https://`.
- Never commit `.env`. Use your host's secret manager in production.

## Performance / low-bandwidth notes

- Images use `next/image` with responsive sizes, WebP/AVIF by default.
- Event card grid and browse listing paginated server-side.
- Fonts loaded via `next/font/google` with `display=swap` to avoid FOIT.
- Reduced-motion respected globally.

---

## Deployment — Vercel + Neon/Supabase (recommended)

This stack is designed for one-click Vercel deploys against a managed Postgres.

### Step 1 — Create a Postgres database

Pick one:

- **Neon** — [neon.tech](https://neon.tech) — free serverless Postgres. Create a project, copy the **pooled connection string**.
- **Supabase** — [supabase.com](https://supabase.com) — copy the connection string from Project Settings → Database → Connection string (Transaction mode).

### Step 2 — Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo.
3. Set the following **Environment Variables** in the Vercel project settings:

   | Variable                 | Example / Notes                                          |
   |--------------------------|----------------------------------------------------------|
   | `DATABASE_URL`           | Your Neon/Supabase connection string                     |
   | `NEXTAUTH_SECRET`        | `openssl rand -base64 32`                                |
   | `NEXTAUTH_URL`           | Your Vercel URL (e.g. `https://cultureflow.vercel.app`) |
   | `APP_URL`                | Same as `NEXTAUTH_URL`                                    |
   | `APP_NAME`               | `CultureFlow`                                          |
   | `ADMIN_EMAIL`            | Whoever should get ADMIN on sign-up                      |
   | `STRIPE_SECRET_KEY`      | `sk_test_...` (or `sk_live_...`)                          |
   | `STRIPE_PUBLISHABLE_KEY` | `pk_test_...`                                            |
   | `STRIPE_WEBHOOK_SECRET`  | Set after you create the webhook in Stripe               |
   | `DEMO_CHECKOUT`          | **Unset or false in production** — env module refuses    |

4. Click **Deploy**.

### Step 3 — Run migrations against production

From your local machine with `DATABASE_URL` pointed at production:

```bash
npx prisma migrate deploy
npm run db:seed   # optional, only on first deploy
```

### Step 4 — Wire up the Stripe webhook

In the Stripe dashboard → Developers → Webhooks → **Add endpoint**:

- URL: `https://your-app.vercel.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`
- Copy the **signing secret** back into Vercel as `STRIPE_WEBHOOK_SECRET`, then redeploy.

### Step 5 — Promote your admin

Sign up on the live site using the email you set as `ADMIN_EMAIL`. That user automatically receives `ADMIN` role.

## Demo mode — no database required

For demos you can skip Postgres entirely. Set `DEMO_DB=pglite` and the app runs on [PGlite](https://pglite.dev) (Postgres compiled to WASM) inside the server process:

- `npm run build` (with `DEMO_DB=pglite`) runs `scripts/build-demo-db.ts`, which applies the Prisma migrations to an in-memory PGlite, runs `prisma/seed.ts` against it, and writes the snapshot to `prisma/demo/demo-db.tar.gz` (gitignored, regenerated each build). Run it by hand with `npm run demo:db`.
- At runtime `src/lib/db.ts` boots each server instance from that snapshot.
- **Writes are per-instance and vanish on cold start.** Never use this for real data.

This is how the [live demo](https://cultureflow-demo.vercel.app) is deployed. It uses these Vercel production env vars:

| Variable | Value |
|---|---|
| `DEMO_DB` | `pglite` |
| `DATABASE_URL` | any placeholder, e.g. `postgres://demo:demo@localhost:5432/demo` |
| `NEXTAUTH_SECRET` / `CRON_SECRET` | random (`openssl rand -base64 32`) |
| `NEXTAUTH_URL`, `APP_URL` | `https://cultureflow-demo.vercel.app` |
| `ENABLE_PAID_EVENTS`, `ENABLE_SOCIAL_LOGIN`, `DEMO_CHECKOUT` | `false` |

Deploy with `vercel deploy --prod`. `.vercelignore` keeps local `.env` files out of the upload. Seeded event dates are relative to build time, so redeploy now and then to keep the calendar current.

To move to a real database later, attach Neon/Supabase, set `DATABASE_URL`, remove `DEMO_DB`, and follow the Vercel steps above.

## Deployment — Docker (alt path)

Any Docker host works (Fly.io, Cloud Run, Render, Railway, ECS):

```bash
docker build -t cultureflow .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e NEXTAUTH_SECRET=... \
  -e NEXTAUTH_URL=https://your-domain \
  ...
  cultureflow
```

The container runs `prisma migrate deploy` on boot.

---

## Troubleshooting

**`npm install` fails while downloading Prisma engines.** Some sandboxed or firewalled environments block `binaries.prisma.sh`. Use:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npm install
```

**TypeScript errors referencing `@prisma/client` members.** The Prisma client is code-generated from `prisma/schema.prisma`. Make sure `npx prisma generate` has run (it's invoked automatically by the `postinstall` script in `package.json`).

**Stripe webhook verification fails in local testing.** Use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the `whsec_...` value into STRIPE_WEBHOOK_SECRET
```

## Roadmap (manual follow-ups)

- **Stripe Connect** — organizer payouts (today `hasBank = false` placeholder).
- **Transactional email provider** — install nodemailer + wire `src/lib/email.ts` to `EMAIL_SERVER`.
- **Object storage** — implement the S3 driver stub in `src/lib/storage.ts`; set `STORAGE_DRIVER=s3`.
- **Redis rate limiter** — implement the Redis driver stub in `src/lib/rate-limit.ts`; set `RATE_LIMIT_DRIVER=redis`.
- **Sentry** — install `@sentry/nextjs` for error tracking.
- **Mobile money** (MTN MoMo, m-Gurush, DigiCash) — requires commercial agreements per provider. Checkout is built behind an abstraction so adding a provider is additive.
- **Offline ticket wallet** — a Service Worker that caches issued tickets.
- **E2E tests** with Playwright covering the core flows.
- **CI/CD** — a sample GitHub Actions file (lint, test, build, preview deploy).

## License & contribution

Add a license file before publishing publicly. Contributions: open a PR with tests.
