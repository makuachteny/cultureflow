"use client";

/**
 * CheckoutForm — multi-step checkout, rendered as a popup modal
 * over the event page.
 *
 *   ┌──────────────────────────────────────── ✕ ──┐
 *   │ ←  Checkout                                 │   (sticky inside card)
 *   │     Time left 28:49                         │
 *   ├─────────────────────────────────┬──────────-│
 *   │ Contact information             │ [poster]  │
 *   │ [first][last] [email][confirm]  │           │
 *   │                                 │ Order     │
 *   │ Ticket 1 · <Tier>               │ summary   │
 *   │ ☐ Same as contact info          │ 1× T  $X  │
 *   │ [first][last] [email] [phone]   │ Total $X  │
 *   │                                 │           │
 *   │ ☑ I agree to <Terms>            │           │
 *   │ [ Register / Pay $XX ]          │           │
 *   └─────────────────────────────────┴───────────┘
 *
 * Open/close is controlled by the parent (CheckoutLauncher) — this
 * component is purely the modal contents. It traps focus, locks body
 * scroll, and closes on ESC or backdrop click. The 30-min countdown is
 * a client-side reminder; seats aren't held server-side until the user
 * hits Register, at which point /api/checkout reserves atomically and
 * fails cleanly with "no longer available" if the window has closed.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { PLACEHOLDER_BANNER } from "@/lib/stock-photos";
import FollowButton from "@/components/FollowButton";

type Tier = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  remaining: number;
};

type EventLite = {
  id: string;
  slug: string;
  title: string;
  bannerUrl: string | null;
  startsAt: string;       // ISO
  endsAt:   string;       // ISO
  organizerId: string;
  organizerName: string | null;
  organizerImage: string | null;
  organizerFollowerCount: number;
  venueName: string | null;
  city: string | null;
  country: string | null;
  type: string;
  refundPolicy: string | null;
};

type SimilarEvent = {
  id: string;
  slug: string;
  title: string;
  bannerUrl: string | null;
  startsAt: string;       // ISO
  priceLabel: string;
  city: string | null;
  organizerName: string | null;
};

type Props = {
  event: EventLite;
  tiers: Tier[];
  initialQty: Record<string, number>;
  defaultEmail: string;
  defaultName: string;
  /** Whether the current user already follows the event organizer.
   *  Drives the initial state of the Follow button on the success view. */
  isFollowingOrganizer: boolean;
  /** Up to ~6 upcoming events from the same organizer — drives the
   *  "Make more plans with these events" rail on the success view. */
  similarEvents: SimilarEvent[];
  /** Called when the user closes the modal (X button, ESC, or backdrop click). */
  onClose: () => void;
};

const COUNTDOWN_MS = 30 * 60 * 1000; // 30 minutes — industry-standard ticket-hold window

export default function CheckoutForm({
  event, tiers, initialQty, defaultEmail, defaultName,
  isFollowingOrganizer, similarEvents, onClose
}: Props) {
  const router    = useRouter();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  /** When the order goes through we flip the modal into a success state
   *  and stay open — the user sees the confirmation, can follow the
   *  organizer, browse "more plans", or jump to /tickets via the CTA. */
  const [succeeded, setSucceeded] = useState<{ orderId: string } | null>(null);

  /* ─── A11y: focus trap, ESC, body-scroll lock ─── */
  useEffect(() => {
    openerRef.current = document.activeElement;

    // Focus the first interactive element when the modal opens.
    requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Trap Tab inside the dialog.
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [onClose]);

  /* ─── Tier line items ─── */
  const lines = useMemo(
    () =>
      tiers
        .map((t) => ({ tier: t, qty: initialQty[t.id] ?? 0 }))
        .filter((l) => l.qty > 0),
    [tiers, initialQty]
  );
  const totalQty   = lines.reduce((s, l) => s + l.qty, 0);
  const totalCents = lines.reduce((s, l) => s + l.tier.priceCents * l.qty, 0);
  const currency   = lines[0]?.tier.currency ?? "USD";
  const isFreeOrder = totalCents === 0;

  /* ─── Contact info ─── */
  const [firstName, setFirstName] = useState(splitName(defaultName).first);
  const [lastName,  setLastName]  = useState(splitName(defaultName).last);
  const [email,     setEmail]     = useState(defaultEmail);
  const [confirm,   setConfirm]   = useState(defaultEmail);
  const [keepUpdates, setKeepUpdates] = useState(true);

  /* ─── Per-ticket attendee details ─── */
  type Attendee = {
    sameAsContact: boolean;
    first: string; last: string; email: string;
    phone: string; zip: string;
  };
  const flatTickets = useMemo(() => {
    const out: { tier: Tier; index: number; key: string }[] = [];
    for (const l of lines) {
      for (let i = 0; i < l.qty; i++) {
        out.push({ tier: l.tier, index: i, key: `${l.tier.id}-${i}` });
      }
    }
    return out;
  }, [lines]);
  const [attendees, setAttendees] = useState<Record<string, Attendee>>(() => {
    const init: Record<string, Attendee> = {};
    flatTickets.forEach((t, i) => {
      init[t.key] = {
        sameAsContact: i === 0,
        first: "", last: "", email: "", phone: "", zip: ""
      };
    });
    return init;
  });
  function setAttendee(key: string, patch: Partial<Attendee>) {
    setAttendees((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  /* ─── Optional state ─── */
  const [promoCode, setPromoCode] = useState("");
  const [needsMsisdn, setNeedsMsisdn] = useState<null | "MPESA" | "MOMO" | "MGURUSH">(null);
  const [msisdn, setMsisdn] = useState("");
  const [mobilePush, setMobilePush] = useState<null | { orderId: string; message: string }>(null);
  const [agreeToS, setAgreeToS] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const hasRefundPolicy = !!event.refundPolicy && event.refundPolicy.trim().length > 0;

  /* ─── Submission state ─── */
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  /* Mobile-money status-poll interval — kept on a ref so we can clear
   *  it from the unmount cleanup below. Without this, closing the
   *  modal mid-payment leaked an interval that kept POSTing to
   *  /api/checkout/status until its 3-minute self-timeout. */
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Countdown ─── */
  const [expiresAt] = useState(() => Date.now() + COUNTDOWN_MS);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Catch-all cleanup: if a payment poll is in-flight when the modal
  // unmounts (parent flips ?checkout=0, user navigates away, etc.),
  // clear the interval so it doesn't keep firing on a dead component.
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);
  const remainingMs = Math.max(0, expiresAt - now);
  const expired = remainingMs === 0;

  /* ─── Submit ─── */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (expired)             { setError("Your reservation has expired. Please start again."); scrollToError(); return; }
    if (!firstName.trim() || !lastName.trim()) { setError("Enter your first and last name."); scrollToError(); return; }
    if (!email.trim())       { setError("Enter your email address."); scrollToError(); return; }
    if (email.trim().toLowerCase() !== confirm.trim().toLowerCase()) {
      setError("Email and confirmation don't match."); scrollToError(); return;
    }
    if (!agreeToS)           { setError(`Please agree to the ${BRAND_NAME} Terms of Service.`); scrollToError(); return; }
    if (hasRefundPolicy && !agreeRefund) {
      setError("Please acknowledge the event refund policy."); scrollToError(); return;
    }
    if (needsMsisdn && !msisdn.trim()) { setError("Enter your phone number."); scrollToError(); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          attendeeName:  `${firstName.trim()} ${lastName.trim()}`,
          attendeeEmail: email.trim(),
          items: lines.map((l) => ({ tierId: l.tier.id, quantity: l.qty })),
          promoCode: promoCode.trim() || undefined,
          msisdn:    msisdn.trim() || undefined,
          provider:  needsMsisdn ?? undefined
        })
      });
      const data = await res.json();

      if (res.status === 400 && data.needsInput === "msisdn") {
        setNeedsMsisdn(data.provider as "MPESA" | "MOMO" | "MGURUSH");
        return;
      }
      // 422 = profile not complete. The server returns the next-step
      // route plus the list of missing fields; we route the user
      // there immediately rather than dumping a generic error.
      if (res.status === 422 && data.next) {
        const back = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `${data.next}?from=checkout&return=${back}`;
        return;
      }
      if (!res.ok) { setError(data.error ?? "Checkout failed"); scrollToError(); return; }

      // External-redirect rails (Stripe Checkout, etc.) must leave the
      // SPA — no popup-success path possible here.
      if (data.redirectUrl) { window.location.href = data.redirectUrl; return; }
      if (data.initiation?.kind === "redirect") {
        window.location.href = data.initiation.redirectUrl; return;
      }
      // Mobile-money rails — keep polling; once the webhook flips the
      // order to PAID, we flip to the in-modal success view.
      if (data.initiation?.kind === "mobile-push") {
        setMobilePush({ orderId: data.orderId, message: data.initiation.message });
        startStatusPoll(data.orderId);
        return;
      }
      // Free / DEMO / captured — order is already PAID server-side.
      if (data.orderId && data.status === "PAID") {
        setSucceeded({ orderId: data.orderId });
        return;
      }
      setError("Unexpected response from server.");
      scrollToError();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
      scrollToError();
    } finally {
      setBusy(false);
    }
  }

  function startStatusPoll(orderId: string) {
    // Belt-and-suspender: never run two polls at once. If a previous
    // submission's poll is still in flight, kill it before starting fresh.
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const start = Date.now();
    const stop = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    const id = setInterval(async () => {
      if (Date.now() - start > 3 * 60_000) {
        stop();
        setMobilePush(null);
        setError("We didn't see your payment in time. If you approved on your phone, refresh in a minute.");
        scrollToError();
        return;
      }
      try {
        const r = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`);
        if (!r.ok) return;
        const j = await r.json();
        if (j.status === "PAID") {
          stop();
          setMobilePush(null);
          setSucceeded({ orderId });
        } else if (j.status === "FAILED") {
          stop();
          setMobilePush(null);
          setError("Payment was declined. Try again or use a different rail.");
          scrollToError();
        }
      } catch { /* swallow */ }
    }, 2500);
    pollIntervalRef.current = id;
  }

  function scrollToError() {
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ─── Render ─── */
  const banner = event.bannerUrl || PLACEHOLDER_BANNER;
  const niceDate = new Date(event.startsAt).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit"
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-nile-900/80 sm:p-6"
      onMouseDown={(e) => {
        // Only close when the click STARTED on the backdrop — guards
        // against accidental closes when a user drags from inside the
        // card and releases over the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="
          relative w-full bg-white shadow-card overflow-hidden
          sm:max-w-5xl sm:rounded-lg
          h-[100dvh] sm:h-auto sm:max-h-[92vh]
          flex flex-col
        "
      >
        {succeeded ? (
          <SuccessView
            event={event}
            attendeeEmail={email}
            ticketCount={totalQty}
            orderId={succeeded.orderId}
            isFollowing={isFollowingOrganizer}
            similarEvents={similarEvents}
            onClose={onClose}
            onTakeMeToTickets={() => {
              router.push(`/tickets?orderId=${succeeded.orderId}`);
            }}
          />
        ) : (
          <>
        {/* Sticky header inside the card */}
        <header className="shrink-0 grid grid-cols-[auto,1fr,auto] items-center gap-3 px-4 sm:px-6 py-3 border-b border-[color:var(--border-hairline)] bg-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-ink-700 hover:bg-nile-50 motion-safe:transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center min-w-0">
            <div id="checkout-title" className="font-display text-[18px] font-bold text-nile-900 tracking-tight truncate">
              Checkout
            </div>
            <div className={"text-[12px] font-tabular " + (remainingMs < 60_000 ? "text-hibiscus" : "text-ink-500")}>
              {expired ? "Time expired" : `Time left ${formatCountdown(remainingMs)}`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-ink-600 hover:bg-nile-50 motion-safe:transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Scrollable body — two columns on desktop, stacked on mobile */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-0 lg:gap-10 lg:grid-cols-[minmax(0,1fr),320px] px-4 sm:px-6 py-6 lg:py-8">
            {/* LEFT — form */}
            <form onSubmit={onSubmit} className="min-w-0 space-y-8">
              {/* Event glance — only on mobile (the right sidebar covers desktop) */}
              <div className="lg:hidden rounded-lg ring-1 ring-[color:var(--border-hairline)] p-4 flex gap-3 items-center">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-nile-50">
                  <Image src={banner} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-nile-900 text-[15px] truncate">{event.title}</div>
                  <div className="text-[12px] text-ink-500 truncate">{niceDate}</div>
                </div>
              </div>

              <Section
                title="Contact information"
                subtitle={
                  <>
                    <span className="text-hibiscus">*</span>{" "}
                    <span className="text-ink-500">Required</span>
                  </>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input id="first-name" label="First name" required value={firstName} onChange={setFirstName} autoComplete="given-name" />
                  <Input id="last-name"  label="Last name"  required value={lastName}  onChange={setLastName}  autoComplete="family-name" />
                  <Input id="email"      label="Email address"   required type="email" value={email}   onChange={setEmail}   autoComplete="email" />
                  <Input id="confirm"    label="Confirm email"   required type="email" value={confirm} onChange={setConfirm} autoComplete="email" />
                </div>
                <label className="mt-4 flex items-start gap-3 text-[13.5px] text-ink-700">
                  <Checkbox checked={keepUpdates} onChange={setKeepUpdates} />
                  <span>Keep me updated on more events and news from this event organizer.</span>
                </label>
              </Section>

              {flatTickets.map((ft, i) => {
                const a = attendees[ft.key];
                return (
                  <Section key={ft.key} title={`Ticket ${i + 1} · ${ft.tier.name}`}>
                    {i === 0 && (
                      <label className="flex items-center gap-3 text-[13.5px] text-ink-700 mb-3">
                        <Checkbox
                          checked={a.sameAsContact}
                          onChange={(v) => setAttendee(ft.key, { sameAsContact: v })}
                        />
                        <span>Same as contact information.</span>
                      </label>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        id={`a-${ft.key}-first`}
                        label="First name"
                        required={i !== 0}
                        value={a.sameAsContact && i === 0 ? firstName : a.first}
                        onChange={(v) => setAttendee(ft.key, { first: v })}
                        disabled={a.sameAsContact && i === 0}
                        autoComplete="given-name"
                      />
                      <Input
                        id={`a-${ft.key}-last`}
                        label="Last name"
                        required={i !== 0}
                        value={a.sameAsContact && i === 0 ? lastName : a.last}
                        onChange={(v) => setAttendee(ft.key, { last: v })}
                        disabled={a.sameAsContact && i === 0}
                        autoComplete="family-name"
                      />
                      <Input
                        id={`a-${ft.key}-email`}
                        label="Email address"
                        type="email"
                        required={i !== 0}
                        value={a.sameAsContact && i === 0 ? email : a.email}
                        onChange={(v) => setAttendee(ft.key, { email: v })}
                        disabled={a.sameAsContact && i === 0}
                        autoComplete="email"
                        className="sm:col-span-2"
                      />
                      <Input
                        id={`a-${ft.key}-phone`}
                        label="Cell phone"
                        type="tel"
                        value={a.phone}
                        onChange={(v) => setAttendee(ft.key, { phone: v })}
                        autoComplete="tel"
                      />
                      <Input
                        id={`a-${ft.key}-zip`}
                        label="Zip / postal code"
                        value={a.zip}
                        onChange={(v) => setAttendee(ft.key, { zip: v })}
                        autoComplete="postal-code"
                      />
                    </div>
                  </Section>
                );
              })}

              {!isFreeOrder && (
                <Section title="Promo code">
                  <PromoField value={promoCode} onChange={setPromoCode} />
                </Section>
              )}

              {needsMsisdn && (
                <Section title={
                  needsMsisdn === "MPESA" ? "M-Pesa phone number" :
                  needsMsisdn === "MOMO"  ? "MTN MoMo phone number" :
                  "m-Gurush phone number"
                }>
                  <input
                    className="input"
                    placeholder={
                      needsMsisdn === "MPESA"   ? "+2547XX XXX XXX" :
                      needsMsisdn === "MOMO"    ? "+2567X XXX XXX"  :
                      "+2119X XXX XXX"
                    }
                    value={msisdn}
                    onChange={(e) => setMsisdn(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                  <p className="mt-1.5 text-[12px] text-ink-600">
                    We&apos;ll send a payment prompt to your handset. Approve it with your PIN.
                  </p>
                </Section>
              )}

              {mobilePush && (
                <div className="rounded-lg ring-1 ring-acacia-500/20 bg-acacia-50 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-acacia-600">
                    <span className="pulse-dot bg-acacia-600" aria-hidden /> Waiting for your phone…
                  </div>
                  <p className="mt-2 text-[13px] text-ink-700 leading-relaxed">{mobilePush.message}</p>
                </div>
              )}

              {hasRefundPolicy && (
                <Section title="Refund policy" required>
                  <div className="rounded-lg bg-cream-100 ring-1 ring-[color:var(--border-hairline)] p-4 max-h-44 overflow-y-auto text-[13.5px] text-ink-700 leading-relaxed whitespace-pre-line">
                    {event.refundPolicy}
                  </div>
                  <label className="mt-3 flex items-start gap-3 text-[13.5px] text-ink-700">
                    <Checkbox checked={agreeRefund} onChange={setAgreeRefund} />
                    <span>I have read and agree to the refund policy above.</span>
                  </label>
                </Section>
              )}

              {error && (
                <div
                  ref={errorRef}
                  role="alert"
                  className="rounded-lg ring-1 ring-hibiscus/30 bg-hibiscus/10 px-4 py-3 text-[14px] text-hibiscus"
                >
                  {error}
                </div>
              )}

              <div className="space-y-3 border-t border-[color:var(--border-hairline)] pt-6">
                <label className="flex items-start gap-3 text-[13.5px] text-ink-700">
                  <Checkbox checked={agreeToS} onChange={setAgreeToS} />
                  <span>
                    By selecting <span className="font-semibold text-nile-900">{isFreeOrder ? "Register" : "Pay"}</span>, I agree to the{" "}
                    <Link href="/legal/terms" className="text-nile font-semibold hover:underline">{BRAND_NAME} Terms of Service</Link>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy || expired || !!mobilePush}
                  className="btn btn-primary w-full sm:w-auto sm:min-w-[200px] !h-12 text-[15px] !rounded-md"
                >
                  {busy
                    ? "Processing…"
                    : mobilePush
                      ? "Waiting…"
                      : expired
                        ? "Reservation expired"
                        : isFreeOrder
                          ? "Register"
                          : `Pay ${formatPrice(totalCents, currency)}`}
                </button>

                <p className="text-[12px] text-ink-500">
                  Powered by {BRAND_NAME}. Secure checkout · 100% refund if the event is cancelled.
                </p>
              </div>
            </form>

            {/* RIGHT — sidebar with poster + summary (desktop only) */}
            <aside className="hidden lg:block">
              <div className="space-y-5">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-nile-50 shadow-sm">
                  <Image src={banner} alt="" fill sizes="320px" className="object-cover" />
                </div>

                <div className="rounded-lg bg-cream-100 ring-1 ring-[color:var(--border-hairline)] p-5">
                  <div className="font-display text-[16px] font-bold text-nile-900 tracking-tight">
                    Order summary
                  </div>
                  <ul className="mt-4 space-y-3 text-[13.5px]">
                    {lines.map((l) => (
                      <li key={l.tier.id} className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-ink-800">
                          <span className="font-semibold">{l.qty} ×</span>{" "}
                          <span className="break-words">{l.tier.name}</span>
                        </span>
                        <span className="font-tabular text-nile-900 shrink-0">
                          {formatPrice(l.tier.priceCents * l.qty, l.tier.currency)}
                        </span>
                      </li>
                    ))}
                    <li className="border-t border-[color:var(--border-hairline)] pt-3 flex items-start justify-between gap-3">
                      <span className="text-ink-700">
                        Delivery
                        <div className="text-[12px] text-ink-500">{totalQty} × eTicket</div>
                      </span>
                      <span className="font-tabular text-nile-900">
                        {formatPrice(0, currency)}
                      </span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-[color:var(--border-hairline)] flex items-center justify-between">
                    <span className="font-display font-bold text-nile-900 text-[15px]">Total</span>
                    <span className="font-display font-bold text-nile-900 text-[20px] font-tabular tracking-tight">
                      {formatPrice(totalCents, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Mobile order-summary */}
            <div className="lg:hidden mt-8">
              <div className="rounded-lg bg-cream-100 ring-1 ring-[color:var(--border-hairline)] p-5">
                <div className="font-display text-[16px] font-bold text-nile-900 tracking-tight">
                  Order summary
                </div>
                <ul className="mt-4 space-y-3 text-[13.5px]">
                  {lines.map((l) => (
                    <li key={l.tier.id} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 text-ink-800">
                        <span className="font-semibold">{l.qty} ×</span> {l.tier.name}
                      </span>
                      <span className="font-tabular text-nile-900 shrink-0">
                        {formatPrice(l.tier.priceCents * l.qty, l.tier.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-[color:var(--border-hairline)] flex items-center justify-between">
                  <span className="font-display font-bold text-nile-900 text-[15px]">Total</span>
                  <span className="font-display font-bold text-nile-900 text-[20px] font-tabular tracking-tight">
                    {formatPrice(totalCents, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function Section({
  title, subtitle, required, children
}: {
  title: string;
  subtitle?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-[18px] sm:text-[20px] font-bold text-nile-900 tracking-tight">
          {title}
          {required && <span className="text-hibiscus ml-1">*</span>}
        </h2>
        {subtitle && <div className="mt-1 text-[12.5px] text-ink-600">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function Input({
  id, label, value, onChange, type = "text",
  required, disabled, autoComplete, className
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={"relative " + (className ?? "")}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder=" "
        aria-label={label}
        className="input peer w-full disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <label
        htmlFor={id}
        className="
          pointer-events-none absolute left-3 top-1/2 -translate-y-1/2
          text-[14px] text-ink-500 motion-safe:transition-all
          peer-focus:top-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-nile peer-focus:bg-white peer-focus:px-1
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1
          peer-disabled:opacity-60
        "
      >
        {label}{required && <span className="text-hibiscus ml-0.5">*</span>}
      </label>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      role="checkbox"
      tabIndex={0}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); }
      }}
      className={
        "shrink-0 inline-flex h-5 w-5 items-center justify-center rounded border-[1.5px] cursor-pointer motion-safe:transition-colors " +
        (checked
          ? "border-nile bg-nile text-white"
          : "border-[color:var(--border-hairline)] bg-white hover:border-nile/40")
      }
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

function PromoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(value.length > 0);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[14px] font-semibold text-nile hover:underline"
      >
        Have a promo code?
      </button>
    );
  }
  return (
    <input
      className="input"
      placeholder="DIASPORA10"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      autoCapitalize="characters"
    />
  );
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─────────────────────────── SuccessView ───────────────────────────
 * Post-purchase confirmation, rendered in place of
 * the form once /api/checkout returns PAID. Lets the user:
 *   • land on /tickets via a primary "Take me to my tickets" CTA,
 *   • follow the organizer (FollowButton hits /api/follows),
 *   • browse "more plans" — upcoming events from the same organizer,
 *   • share the event back to their network.
 *
 * The header drops the countdown and instead shows the order ref +
 * "Take me to my tickets" button so the user has an obvious exit path.
 * ────────────────────────────────────────────────────────────────── */
function SuccessView({
  event, attendeeEmail, ticketCount, orderId,
  isFollowing, similarEvents, onClose, onTakeMeToTickets
}: {
  event: EventLite;
  attendeeEmail: string;
  ticketCount: number;
  orderId: string;
  isFollowing: boolean;
  similarEvents: SimilarEvent[];
  onClose: () => void;
  onTakeMeToTickets: () => void;
}) {
  const orderRef  = `#${orderId.slice(-10).toUpperCase()}`;
  const dateLabel = formatSuccessDate(new Date(event.startsAt), new Date(event.endsAt));
  const locationLabel =
    event.type === "ONLINE"
      ? "Online event"
      : [event.city, event.country].filter(Boolean).join(", ") || event.venueName || "Venue TBA";

  // Build the share targets — keep this small & robust; mailto/X/FB
  // open in new tabs. We omit Messenger (needs an FB app id) to match
  // what the rest of cultureflow's share surfaces ship with.
  const url   = typeof window !== "undefined"
    ? `${window.location.origin}/events/${event.slug}`
    : `/events/${event.slug}`;
  const shareText = `Just got a ticket to ${event.title} — ${url}`;
  const fbHref    = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xHref     = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const mailHref  = `mailto:?subject=${encodeURIComponent(`I'm going to ${event.title}`)}&body=${encodeURIComponent(shareText)}`;

  return (
    <>
      {/* Header: green check + thanks + order ref · Take me to my tickets · close */}
      <header className="shrink-0 grid grid-cols-[1fr,auto,auto] items-center gap-3 px-4 sm:px-6 py-3 border-b border-[color:var(--border-hairline)] bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acacia text-white" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="font-display text-[16px] sm:text-[18px] font-bold text-nile-900 tracking-tight">
              Thanks for your order!
            </span>
            <span className="ml-2 text-[12.5px] text-ink-500 font-tabular">{orderRef}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onTakeMeToTickets}
          className="rounded-md ring-2 ring-nile px-3.5 py-1.5 text-[13px] font-bold text-white bg-nile hover:bg-nile-700 motion-safe:transition-colors"
        >
          Take me to my tickets
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-9 w-9 inline-flex items-center justify-center rounded-full text-ink-600 hover:bg-nile-50 motion-safe:transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-0 lg:gap-10 lg:grid-cols-[minmax(0,1fr),320px] px-4 sm:px-6 py-7 lg:py-9">
          {/* LEFT — confirmation copy */}
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
              You&apos;re going to
            </div>
            <h2 id="checkout-title" className="mt-2 font-display text-[28px] sm:text-[32px] lg:text-[36px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
              {event.title}
            </h2>

            {/* Three-up details grid */}
            <dl className="mt-8 grid gap-6 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
                  {ticketCount} {ticketCount === 1 ? "ticket sent to" : "tickets sent to"}
                </dt>
                <dd className="mt-1.5 text-[14px] text-ink-800 break-words">{attendeeEmail}</dd>
                <Link href="/account/change-email" className="mt-1 inline-block text-[13px] font-semibold text-nile hover:underline">
                  Change
                </Link>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Date</dt>
                <dd className="mt-1.5 text-[14px] text-ink-800">{dateLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Location</dt>
                <dd className="mt-1.5 text-[14px] text-ink-800">{locationLabel}</dd>
              </div>
            </dl>

            {/* Follow organizer card */}
            <div className="mt-10 rounded-lg ring-1 ring-[color:var(--border-hairline)] p-4 sm:p-5 flex items-center gap-4">
              {event.organizerImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={event.organizerImage}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nile text-white font-bold ring-2 ring-white">
                  {event.organizerName?.[0] ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-ink-500">Don&rsquo;t miss out on events from</div>
                <Link
                  href={`/organizer/${event.organizerId}`}
                  className="font-display text-[15px] font-bold text-nile-900 hover:underline truncate block"
                >
                  {event.organizerName ?? "Organizer"}
                </Link>
                <div className="text-[12.5px] text-ink-500 font-tabular">
                  {event.organizerFollowerCount.toLocaleString()}{" "}
                  {event.organizerFollowerCount === 1 ? "follower" : "followers"}
                </div>
              </div>
              <FollowButton
                organizerId={event.organizerId}
                initialFollowing={isFollowing}
              />
            </div>

            {/* Share row */}
            <div className="mt-10 flex items-center gap-5">
              <ShareIcon href={fbHref} label="Share on Facebook">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M22 12a10 10 0 10-11.56 9.88v-6.99h-2.5V12h2.5V9.8c0-2.47 1.47-3.84 3.72-3.84 1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.22 0-1.6.76-1.6 1.54V12h2.73l-.44 2.89h-2.29v6.99A10 10 0 0022 12z" />
                </svg>
              </ShareIcon>
              <ShareIcon href={xHref} label="Share on X">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.503 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </ShareIcon>
              <ShareIcon href={mailHref} label="Share by email">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </ShareIcon>
            </div>
          </div>

          {/* RIGHT — More plans rail */}
          <aside className="mt-10 lg:mt-0">
            <div className="rounded-lg bg-cream-100 ring-1 ring-[color:var(--border-hairline)] p-5">
              <h3 className="font-display text-[16px] font-bold text-nile-900 tracking-tight">
                Make more plans with these events
              </h3>
              {similarEvents.length === 0 ? (
                <p className="mt-3 text-[13px] text-ink-500">
                  No other upcoming events from this organizer right now.
                </p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
                  {similarEvents.slice(0, 4).map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/events/${s.slug}`}
                        className="group block overflow-hidden rounded-md bg-white ring-1 ring-[color:var(--border-hairline)] hover:ring-nile/30 motion-safe:transition-shadow"
                      >
                        <div className="relative aspect-video bg-nile-50">
                          <Image
                            src={s.bannerUrl || PLACEHOLDER_BANNER}
                            alt=""
                            fill
                            sizes="(max-width:1024px) 50vw, 280px"
                            className="object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <div className="font-semibold text-nile-900 text-[13.5px] leading-tight line-clamp-2 group-hover:text-nile">
                            {s.title}
                          </div>
                          <div className="mt-1 text-[11.5px] text-ink-600 font-tabular">
                            {formatRailDate(new Date(s.startsAt))}
                          </div>
                          <div className="text-[11.5px] text-ink-500">
                            {s.priceLabel}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function ShareIcon({
  href, label, children
}: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-ink-700 hover:text-nile motion-safe:transition-colors"
    >
      {children}
    </a>
  );
}

/** "Friday, May 15 · 7 - 9pm EDT" — compact time range for the
 *  "Date" column on the success view. Falls back to a date-only
 *  string when start/end are on different calendar days. */
function formatSuccessDate(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  const dayStr = start.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric" });
  if (!sameDay) {
    return `${dayStr} → ${end.toLocaleString("en-US", { month: "short", day: "numeric" })}`;
  }
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", hour12: true };
  const startT = start.toLocaleTimeString("en-US", opts);
  const endT   = end.toLocaleTimeString("en-US", { ...opts, timeZoneName: "short" });
  return `${dayStr} · ${startT} - ${endT}`.replace(/ AM/g, "am").replace(/ PM/g, "pm");
}

function formatRailDate(d: Date): string {
  const wk = d.toLocaleString("en-US", { weekday: "long" });
  const t  = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${wk} · ${t}`;
}
