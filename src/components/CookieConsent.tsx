"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Cookie-consent banner.
 *
 * Shown once per browser until the user accepts or dismisses. The
 * decision is persisted to localStorage under `tribe.cookie-consent`
 * (not a cookie itself — that would be recursive). Hidden on the auth
 * pages, where the user is mid-flow and chrome distracts from the
 * primary action.
 *
 * This is a soft GDPR banner — it informs + documents choice. It does
 * NOT gate the session / CSRF cookies NextAuth sets (those are
 * strictly-necessary per GDPR and don't require consent). If you
 * later add analytics / marketing cookies, gate them on
 * `readConsent() === "accepted"`.
 */

const KEY = "tribe.cookie-consent";

type Decision = "accepted" | "dismissed" | null;

function readConsent(): Decision {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "accepted" || v === "dismissed") return v;
    return null;
  } catch {
    return null;
  }
}

function writeConsent(d: Exclude<Decision, null>) {
  try { localStorage.setItem(KEY, d); } catch { /* ignore */ }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (d: "accepted" | "dismissed") => {
    writeConsent(d);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-lg border border-[color:var(--border-hairline)] bg-white p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink-900">We use cookies</div>
          <p className="mt-1 text-[13px] text-ink-700 leading-relaxed">
            Strictly-necessary cookies keep you signed in and secure.{" "}
            <Link href="/legal/privacy" className="font-semibold text-nile hover:underline">
              Read the privacy notice
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => decide("dismissed")}
            className="btn btn-ghost btn-sm"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="btn btn-primary btn-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
