"use client";

import { useState } from "react";

export default function StripeConnectCard({
  accountId,
  verifiedAt
}: {
  accountId:  string | null;
  verifiedAt: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  async function onConnect() {
    setBusy(true); setErr(null);
    const res = await fetch("/api/connect/stripe", { method: "POST" });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "Could not start Stripe onboarding.");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  const status = !accountId
    ? "not-started"
    : verifiedAt
    ? "verified"
    : "in-progress";

  return (
    <section className="card p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nile-50 text-nile-700" aria-hidden>
          {/* Stripe-y arrow glyph */}
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[18px] font-bold text-nile-900">Stripe Connect</h2>
          <p className="mt-1 text-[13.5px] text-ink-600 leading-relaxed">
            Cards, Apple Pay, Google Pay — anywhere in the world. Funds land
            directly in your Stripe balance, CultureFlow takes a small platform
            fee on each ticket.
          </p>

          <div className="mt-4 flex items-center gap-3">
            {status === "not-started" && (
              <button
                onClick={onConnect}
                disabled={busy}
                className="btn btn-primary"
              >
                {busy ? "Loading…" : "Connect Stripe"}
              </button>
            )}
            {status === "in-progress" && (
              <>
                <span className="chip chip-gold">Onboarding in progress</span>
                <button
                  onClick={onConnect}
                  disabled={busy}
                  className="btn btn-outline"
                >
                  {busy ? "Loading…" : "Finish onboarding"}
                </button>
              </>
            )}
            {status === "verified" && (
              <>
                <span className="chip chip-acacia">Verified — payouts active</span>
                <span className="text-[12px] font-mono text-ink-500">{accountId}</span>
              </>
            )}
          </div>
          {err && <div role="alert" className="mt-3 text-[13px] text-hibiscus font-semibold">{err}</div>}
        </div>
      </div>
    </section>
  );
}
