/**
 * Centralized environment variable access + startup validation.
 *
 * Required variables throw if missing at first use, so production
 * boots fail loudly and early rather than serving broken pages.
 * Conditional vars (Stripe, Google OAuth) are only required when
 * the feature flag that depends on them is enabled.
 *
 * The module-level `assertProdSafety()` call runs on first import —
 * which happens indirectly via every API route and server page via
 * the auth import chain — catching dangerous production config
 * (DEMO_CHECKOUT=true in production, missing Stripe keys, etc.).
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
      `Set it in your .env / deployment config before starting the server.`
    );
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function flag(name: string): boolean {
  return (process.env[name] ?? "").toLowerCase() === "true";
}

const NODE_ENV = process.env.NODE_ENV ?? "development";

/**
 * DEMO_DB=pglite runs the app on an embedded, in-process Postgres
 * (PGlite) loaded from a seeded snapshot — no hosted database needed.
 * Writes live only as long as the serverless instance. Demo use only.
 */
const DEMO_DB = (process.env.DEMO_DB ?? "").toLowerCase();
const IS_PROD  = NODE_ENV === "production";

/** Build-time and runtime environment, with validation. */
export const env = {
  // Core — required everywhere.
  DEMO_DB,
  DATABASE_URL:    DEMO_DB === "pglite" ? optional("DATABASE_URL") : required("DATABASE_URL"),
  NEXTAUTH_SECRET: required("NEXTAUTH_SECRET"),
  NEXTAUTH_URL:    optional("NEXTAUTH_URL", "http://localhost:3000"),
  APP_URL:         optional("APP_URL",      "http://localhost:3000"),
  ADMIN_EMAIL:     optional("ADMIN_EMAIL"),

  // Feature flags.
  ENABLE_PAID_EVENTS:  flag("ENABLE_PAID_EVENTS"),
  ENABLE_SOCIAL_LOGIN: flag("ENABLE_SOCIAL_LOGIN"),
  DEMO_CHECKOUT:       flag("DEMO_CHECKOUT"),

  // Stripe — only required when paid events are enabled. At least one
  // payment provider must be configured for paid events to work; Stripe
  // is the recommended default and the only one that supports cards.
  STRIPE_SECRET_KEY:      optional("STRIPE_SECRET_KEY"),
  STRIPE_PUBLISHABLE_KEY: optional("STRIPE_PUBLISHABLE_KEY"),
  STRIPE_WEBHOOK_SECRET:  optional("STRIPE_WEBHOOK_SECRET"),

  // M-Pesa (Safaricom Daraja) — for KES collections via STK Push.
  // Get these from https://developer.safaricom.co.ke/.
  MPESA_ENV:             optional("MPESA_ENV", "sandbox"),
  MPESA_CONSUMER_KEY:    optional("MPESA_CONSUMER_KEY"),
  MPESA_CONSUMER_SECRET: optional("MPESA_CONSUMER_SECRET"),
  MPESA_SHORTCODE:       optional("MPESA_SHORTCODE"),
  MPESA_PASSKEY:         optional("MPESA_PASSKEY"),
  MPESA_CALLBACK_URL:    optional("MPESA_CALLBACK_URL"),

  // MTN MoMo Collections — for UGX/RWF/SSP/etc. via Request to Pay.
  // Get these from https://momodeveloper.mtn.com/.
  MOMO_ENV:               optional("MOMO_ENV", "sandbox"),
  MOMO_TARGET_ENV:        optional("MOMO_TARGET_ENV", "sandbox"),
  MOMO_SUBSCRIPTION_KEY:  optional("MOMO_SUBSCRIPTION_KEY"),
  MOMO_API_USER_ID:       optional("MOMO_API_USER_ID"),
  MOMO_API_KEY:           optional("MOMO_API_KEY"),
  MOMO_CALLBACK_URL:      optional("MOMO_CALLBACK_URL"),

  // m-Gurush (South Sudan) — credentials issued at merchant onboarding.
  MGURUSH_ENV:             optional("MGURUSH_ENV", "sandbox"),
  MGURUSH_BASE_URL:        optional("MGURUSH_BASE_URL"),
  MGURUSH_MERCHANT_ID:     optional("MGURUSH_MERCHANT_ID"),
  MGURUSH_API_KEY:         optional("MGURUSH_API_KEY"),
  MGURUSH_WEBHOOK_SECRET:  optional("MGURUSH_WEBHOOK_SECRET"),
  MGURUSH_CALLBACK_URL:    optional("MGURUSH_CALLBACK_URL"),

  // Platform commission as a percentage (0..100). Defaults to 5 % when
  // unset. Snapshotted on each Order at creation time.
  PLATFORM_FEE_PERCENT: optional("PLATFORM_FEE_PERCENT", "5"),

  // Cron sweep secret — required header for the reservation-sweep route.
  CRON_SECRET: optional("CRON_SECRET"),

  // Google OAuth — only required when social login is enabled.
  GOOGLE_CLIENT_ID:     optional("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET"),

  // Email transport — required for receipts + notifications in prod.
  EMAIL_SERVER: optional("EMAIL_SERVER"),
  EMAIL_FROM:   optional("EMAIL_FROM"),

  NODE_ENV,
  IS_PROD
};

/**
 * Fail-fast production-safety assertions. Runs once at module load.
 * Never skipped by `ignoreDuringBuilds`-style config because the throw
 * happens at *runtime*, so a server that accidentally ships with a
 * dangerous config refuses to boot rather than serving traffic.
 */
function assertProdSafety() {
  if (!IS_PROD) return;

  // `next build` runs the page-data collector with NODE_ENV=production,
  // which would otherwise fire these assertions against the developer's
  // local .env (DEMO_CHECKOUT=true, http NEXTAUTH_URL, etc.) and fail
  // the build. Skip the asserter during the build phase so prod-time
  // misconfiguration still throws on first request, while a developer
  // can still run `next build` locally to validate the bundle.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Collect EVERY violation before throwing — surfacing one error at a
  // time forced operators through a tedious fix-restart-fix loop. A
  // single thrown error with a multi-line message tells them up-front
  // exactly which env vars to set.
  const errs: string[] = [];

  // 1. NEXTAUTH_SECRET must look strong (32 bytes / 256 bits minimum).
  if (env.NEXTAUTH_SECRET.length < 32) {
    errs.push(
      "NEXTAUTH_SECRET must be at least 32 characters. " +
      "Generate one with: openssl rand -base64 32"
    );
  }

  // 2. Demo checkout hands out tickets for free — hard-refuse in prod.
  if (env.DEMO_CHECKOUT) {
    errs.push(
      "DEMO_CHECKOUT=true is only safe in development. " +
      "Set DEMO_CHECKOUT=false (or unset it) for production deploys."
    );
  }

  // 3. NEXTAUTH_URL / APP_URL must be https in production so session
  //    cookies actually honor the Secure + SameSite=Lax contract.
  for (const k of ["NEXTAUTH_URL", "APP_URL"] as const) {
    const v = env[k];
    if (!v.startsWith("https://")) {
      errs.push(
        `${k} must be an https:// URL in production (got "${v}"). ` +
        "NextAuth's Secure cookie flag requires a TLS origin."
      );
    }
  }

  // 4. Feature-flag-gated vars. Paid events need at least ONE payment
  //    rail wired up; we don't insist on Stripe specifically since you
  //    might be running an Africa-only deployment on M-Pesa + MoMo.
  if (env.ENABLE_PAID_EVENTS) {
    const stripeOK   = !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET;
    const mpesaOK    = !!env.MPESA_CONSUMER_KEY && !!env.MPESA_CONSUMER_SECRET &&
                       !!env.MPESA_SHORTCODE   && !!env.MPESA_PASSKEY &&
                       !!env.MPESA_CALLBACK_URL;
    const momoOK     = !!env.MOMO_SUBSCRIPTION_KEY && !!env.MOMO_API_USER_ID &&
                       !!env.MOMO_API_KEY && !!env.MOMO_CALLBACK_URL;
    const mgurushOK  = !!env.MGURUSH_BASE_URL && !!env.MGURUSH_MERCHANT_ID &&
                       !!env.MGURUSH_API_KEY && !!env.MGURUSH_WEBHOOK_SECRET &&
                       !!env.MGURUSH_CALLBACK_URL;
    if (!(stripeOK || mpesaOK || momoOK || mgurushOK)) {
      errs.push(
        "ENABLE_PAID_EVENTS=true but no payment rail is configured. " +
        "Set credentials for at least one of: Stripe, M-Pesa Daraja, MTN MoMo, m-Gurush."
      );
    }
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
      errs.push(
        "STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not. " +
        "Set the webhook secret so paid orders can finalise."
      );
    }
  }
  if (env.ENABLE_SOCIAL_LOGIN) {
    for (const k of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const) {
      if (!env[k]) {
        errs.push(`ENABLE_SOCIAL_LOGIN=true but ${k} is not set.`);
      }
    }
  }

  if (errs.length > 0) {
    const lines = errs.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
    throw new Error(
      `[env] Production safety check failed — ${errs.length} ` +
      `${errs.length === 1 ? "issue" : "issues"} blocking boot:\n${lines}\n\n` +
      "See .env.example for documentation on each variable."
    );
  }
}

assertProdSafety();
