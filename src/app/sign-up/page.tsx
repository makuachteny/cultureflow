"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";
import BackButton from "@/components/BackButton";
import Field from "@/components/ui/Field";
import { BRAND_HOME_LABEL, BRAND_NAME } from "@/lib/brand";
import { safeCallback } from "@/lib/safe-redirect";

/**
 * Sign-up — centered card on a brand-tinted backdrop.
 * Mirrors the sign-in layout exactly, so the two flows feel like one
 * experience.
 *
 * Root layout hides the site header/footer on /sign-up via ChromeGate;
 * this page owns the full viewport.
 */
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  );
}

function SignUpInner() {
  const router = useRouter();
  const params = useSearchParams();
  // safeCallback prevents `?callbackUrl=https://evil.com/…` open redirects.
  const callbackUrl = safeCallback(params.get("callbackUrl"), "/");

  const [form, setForm] = useState({
    name: "", email: "", password: "", city: "", country: ""
  });
  const [err,  setErr]  = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Could not create account.");
      setBusy(false);
      return;
    }
    // Auto-sign-in immediately after register.
    const signInRes = await signIn("credentials", {
      email:    form.email,
      password: form.password,
      redirect: false
    });
    if (signInRes?.error) {
      setBusy(false);
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    // Full-page navigation so the App Router doesn't serve the
    // prefetched logged-out RSC cache for `callbackUrl` — soft-pushing
    // here was producing a flash of the unauthenticated layout that
    // only resolved on hard refresh.
    window.location.assign(callbackUrl);
  }

  const signInHref = `/sign-in${
    callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
  }`;

  return (
    <div className="relative isolate min-h-screen w-full">
      {/* ─── Soft brand backdrop — matches sign-in ─── */}
      <div
        className="absolute inset-0 -z-10 flag-bands"
        aria-hidden
        
      />

      {/* ─── Top bar — back affordance + brand-home, always visible ─── */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <BackButton />
      </div>

      {/* ─── Centered card ─── */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[480px] bg-white border-[3px] border-ink px-7 pb-9 pt-10 shadow-[8px_8px_0_0_#000] sm:px-12 sm:pt-12">
          {/* Brand lockup */}
          <Link
            href="/"
            aria-label={BRAND_HOME_LABEL}
            className="mb-8 inline-flex items-center"
          >
            <Logo variant="horizontal" size={36} href={null} />
          </Link>

          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
            Create your account
          </div>
          <h1 className="mt-2 font-display text-[28px] sm:text-[32px] font-extrabold leading-[1.1] tracking-tight text-nile-900">
            Join the tribe.
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-600 leading-relaxed">
            Free to create an account. Host your first event in minutes —
            from Juba to Calgary.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field label="Full name">
              <input
                className="input"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </Field>

            <Field label="Email">
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </Field>

            <Field label="Password" hint="At least 8 characters.">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="City (optional)">
                <input
                  className="input"
                  autoComplete="address-level2"
                  placeholder="Juba"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="Country (optional)">
                <input
                  className="input"
                  autoComplete="country-name"
                  placeholder="South Sudan"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                />
              </Field>
            </div>

            {err && (
              <div role="alert" className="text-[13px] font-semibold text-hibiscus">
                {err}
              </div>
            )}

            <button disabled={busy} className="btn btn-primary btn-lg w-full mt-2">
              {busy ? "Creating…" : "Create account"}
            </button>

            <p className="text-[12px] text-ink-500 leading-relaxed pt-1">
              By creating an account you agree to our{" "}
              <Link href="/legal/terms"   className="font-semibold text-nile hover:underline">terms</Link>
              {" "}and{" "}
              <Link href="/legal/privacy" className="font-semibold text-nile hover:underline">privacy policy</Link>.
            </p>
          </form>

          <p className="mt-7 text-center text-[14px] text-ink-700">
            Already have an account?{" "}
            <Link href={signInHref} className="font-semibold text-nile hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Footer strip — same pattern as the rest of the app ─── */}
      <footer className="absolute inset-x-0 bottom-0 px-6 pb-5 text-[11px] text-ink-500 flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
        <nav className="flex gap-4">
          <Link href="/help"           className="hover:text-nile">Help</Link>
          <Link href="/legal/terms"    className="hover:text-nile">Terms</Link>
          <Link href="/legal/privacy"  className="hover:text-nile">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
