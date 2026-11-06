#!/usr/bin/env node
/**
 * HTTP smoke test — hits every public page + every authenticated page +
 * every API route with a signed-in organizer session. Any 500 is a bug;
 * 401/403 is expected on the handful of admin-only routes when we're
 * signed in as a non-admin.
 *
 * Run while `npm run dev` is up. Usage:
 *   node scripts/smoke-http.mjs
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const CREDS = {
  email: "alek@cultureflow.example",
  password: "password123"
};

/* ─── Tiny fetch-with-redirects + cookie jar helper ─── */
const jar = new Map();
function putCookies(headers) {
  const raw = headers.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie")] : []);
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function hit(method, path, { body, headers: extra, redirect = "manual" } = {}) {
  const headers = new Headers(extra ?? {});
  const ck = cookieHeader();
  if (ck) headers.set("cookie", ck);
  const res = await fetch(BASE + path, { method, headers, body, redirect });
  putCookies(res.headers);
  return res;
}

/* ─── Sign in via NextAuth credentials provider ─── */
async function signIn() {
  // 1. Prime the CSRF cookie.
  const csrfRes = await hit("GET", "/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  // 2. POST the credentials.
  const form = new URLSearchParams();
  form.set("csrfToken", csrfToken);
  form.set("email", CREDS.email);
  form.set("password", CREDS.password);
  form.set("callbackUrl", "/dashboard");
  form.set("redirect", "false");
  form.set("json", "true");

  const res = await hit("POST", "/api/auth/callback/credentials", {
    body: form,
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });
  return res.status;
}

/* ─── Define the routes to exercise ─── */
const publicGETs = [
  "/",
  "/browse",
  "/about",
  "/contact",
  "/help",
  "/pricing",
  "/how-it-works",
  "/for-attendees",
  "/for-organizers",
  "/legal/terms",
  "/legal/privacy",
  "/legal/refunds",
  "/apps",
  "/events/new",
  "/sign-in",
  "/sign-up",
  "/events/city/london",
  "/events/category/music",
  "/robots.txt",
  "/sitemap.xml",
  "/api/health"
];

const authedGETs = [
  "/dashboard",
  "/dashboard/events",
  "/dashboard/events/new",
  "/dashboard/events/templates",
  "/dashboard/orders",
  "/dashboard/settings",
  "/dashboard/settings?tab=team",
  "/dashboard/settings?tab=fees",
  "/dashboard/settings?tab=plan",
  "/dashboard/settings?tab=extensions",
  "/dashboard/marketing",
  "/dashboard/marketing?tab=email",
  "/dashboard/marketing?tab=social",
  "/dashboard/marketing?tab=whatsapp",
  "/dashboard/marketing?tab=ads",
  "/dashboard/marketing?tab=promos",
  "/dashboard/marketing?tab=settings",
  "/dashboard/finance",
  "/dashboard/finance?tab=charges",
  "/dashboard/finance?tab=credits",
  "/dashboard/finance?tab=invoices",
  "/dashboard/reports",
  "/tickets",
  "/welcome",
  "/api/exports/orders",
  "/api/exports/attendees",
  "/api/exports/payouts"
];

/* ─── Run ─── */
let fail = 0;
const failures = [];

async function run(label, path, expectRange, method = "GET") {
  const res = await hit(method, path, { redirect: "manual" });
  const ok = Array.isArray(expectRange) ? expectRange.includes(res.status) : res.status === expectRange;
  console.log(ok ? `✓  ${label.padEnd(10)} ${res.status}  ${path}` : `✗  ${label.padEnd(10)} ${res.status}  ${path}`);
  if (!ok) {
    fail++;
    failures.push({ path, status: res.status, label });
  }
}

console.log(`== PUBLIC ==`);
for (const p of publicGETs) {
  await run("public", p, [200, 301, 302, 307, 308]);
}

console.log(`\n== SIGN IN as ${CREDS.email} ==`);
const signInStatus = await signIn();
console.log(`sign-in POST returned ${signInStatus}`);

// Confirm cookie stuck
const sessionRes = await hit("GET", "/api/auth/session");
const session = await sessionRes.json();
if (!session?.user?.email) {
  console.error("✗ session missing user after sign-in — aborting authed tests");
  process.exit(1);
}
console.log(`✓  session user: ${session.user.email} (${session.user.role})`);

console.log(`\n== AUTHED ==`);
for (const p of authedGETs) {
  // 200 = rendered; 307/302 = redirect (e.g. back to dashboard); all fine.
  await run("authed", p, [200, 302, 307]);
}

console.log(`\n== RESULT ==`);
console.log(`${fail === 0 ? "✓ all good" : `✗ ${fail} failure(s)`}`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
process.exit(fail === 0 ? 0 : 1);
