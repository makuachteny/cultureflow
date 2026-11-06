"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";
import BackButton from "@/components/BackButton";
import { BRAND_HOME_LABEL, BRAND_NAME } from "@/lib/brand";
import { safeCallback } from "@/lib/safe-redirect";

/**
 * Sign-in — centered card on a tinted hero image.
 *   • Background photo with a deep-nile wash so the white card pops.
 *   • Two-step flow: email first, then password (matches the screenshot).
 *   • Social tiles below an "Or sign in with" rule.
 *
 * Root layout hides the site header/footer on /sign-in, so this owns
 * the full viewport.
 *
 * `useSearchParams()` can't run during Next.js's static HTML shell pass,
 * so the inner component is wrapped in <Suspense>. The fallback is null
 * (the background image + wash paint instantly from the outer shell).
 */
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const params = useSearchParams();
  // Sanitize callbackUrl — never trust the querystring to redirect
  // to an arbitrary destination. safeCallback enforces same-origin.
  const callbackUrl = safeCallback(params.get("callbackUrl"), "/");

  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return;
    setStep("password");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl
    });
    if (res?.error) {
      setBusy(false);
      setErr("Incorrect email or password.");
      return;
    }
    // Full-page navigation rather than `router.push` — `signIn` with
    // redirect:false sets the session cookie but the App Router keeps
    // its prefetched RSC cache from when the user was unauthenticated,
    // so soft-navigating served the destination page in its
    // logged-out state until a manual refresh. window.location forces
    // a fresh server render that picks up the new session cookie.
    window.location.assign(callbackUrl);
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* ─── Calm brand backdrop — matches sign-up ─── */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px 600px at 12% 12%, rgba(245,184,0,0.10), transparent 60%)," +
            "radial-gradient(900px 600px at 90% 90%, rgba(27,58,133,0.10), transparent 60%)," +
            "var(--color-bg)"
        }}
      />

      {/* ─── Top bar — back affordance + brand-home, always visible ─── */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <BackButton />
      </div>

      {/* ─── Centered card ─── */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[480px] rounded-md bg-white px-7 pb-9 pt-10 shadow-[0_18px_48px_-12px_rgba(14,31,74,0.18)] sm:px-12 sm:pt-12">
          {/* Brand lockup */}
          <Link
            href="/"
            aria-label={BRAND_HOME_LABEL}
            className="mb-8 inline-flex items-center"
          >
            <Logo variant="horizontal" size={36} href={null} />
          </Link>

          {step === "email" ? (
            <EmailStep
              email={email}
              setEmail={setEmail}
              onSubmit={onContinue}
              callbackUrl={callbackUrl}
              signUpHref={`/sign-up${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            />
          ) : (
            <PasswordStep
              email={email}
              password={password}
              setPassword={setPassword}
              onSubmit={onSubmit}
              onBack={() => {
                setErr(null);
                setStep("email");
              }}
              busy={busy}
              err={err}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Step 1 — collect the email, offer social sign-in.
   ───────────────────────────────────────────────────────────── */
function EmailStep({
  email,
  setEmail,
  onSubmit,
  callbackUrl,
  signUpHref
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  callbackUrl: string;
  signUpHref: string;
}) {
  return (
    <>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.2] tracking-tight text-nile-900">
        Welcome!
        <br />
        What&apos;s your email?
      </h1>

      <form onSubmit={onSubmit} className="mt-8">
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[color:var(--border-hairline)] bg-white px-4 py-3.5 text-[15px] text-nile-900 placeholder:text-ink-500 focus:border-nile focus:outline-none focus:ring-2 focus:ring-nile/25"
        />

        <button
          type="submit"
          className="btn btn-primary mt-5 w-full btn-lg"
        >
          Continue
        </button>
      </form>

      <Divider>Or sign in with</Divider>

      <p className="mb-5 text-center text-[12px] leading-[1.5] text-ink-700">
        By clicking Continue or the Apple, Google, or Facebook icons, you
        agree to {BRAND_NAME}&apos;s{" "}
        <Link
          href="/legal/terms"
          className="font-semibold text-nile hover:underline"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy"
          className="font-semibold text-nile hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <div className="mb-7 flex justify-center gap-3">
        <SocialButton provider="apple" label="Sign in with Apple" callbackUrl={callbackUrl} />
        <SocialButton provider="google" label="Sign in with Google" callbackUrl={callbackUrl} />
        <SocialButton provider="facebook" label="Sign in with Facebook" callbackUrl={callbackUrl} />
      </div>

      <p className="text-center text-[14px]">
        <Link
          href="/help"
          className="font-semibold text-nile hover:underline"
        >
          Need help finding your tickets?
        </Link>
      </p>

      <p className="mt-4 text-center text-[13px] text-ink-700">
        New to {BRAND_NAME}?{" "}
        <Link href={signUpHref} className="font-semibold text-nile hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Step 2 — confirm with the password.
   ───────────────────────────────────────────────────────────── */
function PasswordStep({
  email,
  password,
  setPassword,
  onSubmit,
  onBack,
  busy,
  err
}: {
  email: string;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  busy: boolean;
  err: string | null;
}) {
  return (
    <>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.2] tracking-tight text-nile-900">
        Welcome back!
        <br />
        Enter your password.
      </h1>

      <button
        type="button"
        onClick={onBack}
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-600 hover:text-nile-900"
      >
        <span aria-hidden>‹</span> {email}
      </button>

      <form onSubmit={onSubmit} className="mt-6">
        <label className="sr-only" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? "sign-in-error" : undefined}
          className="w-full rounded-lg border border-[color:var(--border-hairline)] bg-white px-4 py-3.5 text-[15px] text-nile-900 placeholder:text-ink-500 focus:border-nile focus:outline-none focus:ring-2 focus:ring-nile/25"
        />

        {err && (
          <p id="sign-in-error" role="alert" className="mt-3 text-[13px] font-semibold text-hibiscus">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary mt-5 w-full btn-lg"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[14px] text-ink-700">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-nile hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Building blocks
   ───────────────────────────────────────────────────────────── */

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-3.5 text-[13px] text-ink-500">
      <span className="h-px flex-1 bg-[color:var(--border-hairline)]" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-[color:var(--border-hairline)]" />
    </div>
  );
}

function SocialButton({
  provider,
  label,
  callbackUrl
}: {
  provider: "apple" | "google" | "facebook";
  label: string;
  callbackUrl: string;
}) {
  const handleClick = () => {
    // Wired only for providers configured in next-auth. Unconfigured ones
    // render but no-op so the layout stays accurate to the design.
    if (provider === "google") {
      void signIn("google", { callbackUrl });
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="flex h-14 w-[72px] items-center justify-center rounded-lg border border-[color:var(--border-hairline)] bg-white transition hover:border-ink-400 hover:shadow-sm"
    >
      {provider === "apple" && <AppleIcon />}
      {provider === "google" && <GoogleIcon />}
      {provider === "facebook" && <FacebookIcon />}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
      <path
        fill="#000"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"
      />
    </svg>
  );
}
