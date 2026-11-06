"use client";

/**
 * TicketSelector — quantity-only step inside the event-page TicketPanel.
 *
 * Picks how many of each tier the buyer wants, then opens the
 * CheckoutLauncher popup by setting `?checkout=1&t_<tierId>=<qty>` on
 * the current event URL. The full attendee form, agreements, promo
 * code, and mobile-money flow live inside that modal so this component
 * stays narrow and the data path is one-way.
 *
 * When every tier is sold out, a separate WaitlistBlock is rendered in
 * place of the stepper.
 */

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";

type Tier = { id: string; name: string; priceCents: number; currency: string; remaining: number };

type Props = {
  eventId: string;
  /** Slug for navigating to /events/[slug]/checkout. */
  slug: string;
  tiers: Tier[];
  signedIn: boolean;
  /** Optional copy shown in the Sold Out / Waitlist heading (e.g. start date). */
  dateHint?: string;
};

export default function TicketSelector({ eventId, slug, tiers, signedIn, dateHint }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(tiers.map((t) => [t.id, 0]))
  );
  const [error, setError] = useState<string | null>(null);
  const [busy,  setBusy]  = useState(false);

  const totalRemaining = tiers.reduce((s, t) => s + Math.max(0, t.remaining), 0);
  const isSoldOut = tiers.length > 0 && totalRemaining === 0;
  const items = useMemo(
    () => tiers
      .filter((t) => (qty[t.id] ?? 0) > 0)
      .map((t) => ({ tierId: t.id, quantity: qty[t.id], priceCents: t.priceCents, currency: t.currency })),
    [qty, tiers]
  );
  const total    = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const currency = tiers[0]?.currency ?? "USD";
  const allFree  = tiers.every((t) => t.priceCents === 0);

  if (isSoldOut) return <WaitlistBlock eventId={eventId} dateHint={dateHint} />;

  if (!signedIn) {
    const callbackUrl = pathname ?? "/browse";
    return (
      <div className="mt-4">
        <p className="text-sm text-ink-600">Sign in to get tickets.</p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="btn btn-primary mt-3 w-full"
        >
          Sign in
        </Link>
      </div>
    );
  }

  function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!items.length) { setError("Select at least one ticket."); return; }
    setBusy(true);
    const params = new URLSearchParams();
    params.set("checkout", "1");
    for (const it of items) params.set(`t_${it.tierId}`, String(it.quantity));
    // Open the CheckoutForm popup over the current event page.
    // `scroll: false` keeps the user's scroll position when the modal
    // appears (the CheckoutLauncher handles body-scroll lock).
    router.push(`/events/${slug}?${params.toString()}`, { scroll: false });
  }

  return (
    <form onSubmit={onContinue} className="mt-4 space-y-4">
      <div className="space-y-2">
        {tiers.map((t) => {
          const tierSoldOut = t.remaining <= 0;
          const isFreeT = t.priceCents <= 0;
          const count = qty[t.id] ?? 0;
          const setCount = (n: number) =>
            setQty((q) => ({ ...q, [t.id]: Math.max(0, Math.min(Math.min(10, t.remaining), n)) }));
          return (
            <div
              key={t.id}
              className={
                "flex items-center gap-3 rounded-lg border p-3 " +
                (tierSoldOut
                  ? "border-[color:var(--border-hairline)] bg-nile-50/40 opacity-70"
                  : "border-[color:var(--border-hairline)] bg-white")
              }
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink-900 truncate">{t.name}</div>
                <div className="mt-1 flex items-center gap-2 text-[13px]">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2 py-0.5 font-semibold " +
                      (isFreeT
                        ? "bg-acacia-50 text-acacia-600"
                        : "bg-gold-50 text-gold-800")
                    }
                    aria-label={isFreeT ? "Free tier" : `Price ${formatPrice(t.priceCents, t.currency)}`}
                  >
                    {isFreeT ? "Free" : formatPrice(t.priceCents, t.currency)}
                  </span>
                  <span className="text-ink-500">
                    {tierSoldOut ? (
                      <span className="font-semibold text-nile-600">Sold out</span>
                    ) : (
                      <>{t.remaining} left</>
                    )}
                  </span>
                </div>
              </div>

              <div
                className="flex items-center rounded-full border border-[color:var(--border-hairline)] bg-white"
                role="group"
                aria-label={`Quantity for ${t.name}`}
              >
                <button
                  type="button"
                  onClick={() => setCount(count - 1)}
                  disabled={tierSoldOut || count <= 0}
                  aria-label={`Decrease quantity for ${t.name}`}
                  className="h-9 w-9 rounded-l-full text-ink-700 hover:bg-nile-50 disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={Math.min(10, t.remaining)}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 0)}
                  disabled={tierSoldOut}
                  className="w-10 h-9 text-center font-tabular font-semibold text-ink-900 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-nile/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label={`Quantity for ${t.name}`}
                />
                <button
                  type="button"
                  onClick={() => setCount(count + 1)}
                  disabled={tierSoldOut || count >= Math.min(10, t.remaining)}
                  aria-label={`Increase quantity for ${t.name}`}
                  className="h-9 w-9 rounded-r-full text-ink-700 hover:bg-nile-50 disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="text-sm text-hibiscus">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[color:var(--border-hairline)] pt-4">
        <div className="text-sm text-ink-600">Total</div>
        <div className="font-display text-[20px] font-bold text-nile-900 font-tabular tracking-tight">
          {formatPrice(total, currency)}
        </div>
      </div>

      <button
        disabled={busy || !items.length}
        className="btn btn-primary w-full"
      >
        {busy ? "Loading…" : allFree && total === 0 ? "Reserve a spot" : "Continue to checkout"}
      </button>
      <p className="text-xs text-ink-500 text-center">
        Secure checkout · 100% refund if the event is cancelled
      </p>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   WaitlistBlock — shown when every tier's `remaining` is zero.
   Self-contained: its own form state and submission.
   ───────────────────────────────────────────────────────────── */

function WaitlistBlock({ eventId, dateHint }: { eventId: string; dateHint?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<{ position: number } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) { setError("Please enter your email to join the waitlist."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, email, name: name || undefined })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Couldn't add you to the waitlist."); return; }
      setJoined({ position: data.position ?? 1 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <div className="mt-4 rounded-lg border border-acacia-50 bg-acacia-50/40 p-4 text-center">
        <div className="font-semibold text-acacia-600">You're on the list.</div>
        <p className="mt-1 text-sm text-ink-600">
          You&rsquo;re #{joined.position} on the waitlist. We&rsquo;ll email you if a spot opens up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-nile-50 px-3 py-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-nile-600">
            Sold out
          </div>
          {dateHint && <div className="text-sm text-ink mt-0.5">{dateHint}</div>}
        </div>
      </div>

      <p className="text-sm text-ink-600">
        Leave your email and we&rsquo;ll notify you if more tickets are released.
      </p>

      <label className="sr-only" htmlFor="waitlist-name">Your name (optional)</label>
      <input
        id="waitlist-name"
        className="input"
        placeholder="Your name (optional)"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="sr-only" htmlFor="waitlist-email">Your email</label>
      <input
        id="waitlist-email"
        className="input"
        type="email"
        placeholder="Your email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "waitlist-error" : undefined}
        required
      />

      {error && <div id="waitlist-error" role="alert" className="text-sm text-hibiscus">{error}</div>}

      <button disabled={busy} className="btn btn-primary w-full">
        {busy ? "Adding you…" : "Join Waitlist"}
      </button>
    </form>
  );
}
