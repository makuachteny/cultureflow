/**
 * TicketPanel — the sticky right-column ticket card on the event detail page.
 *
 * Layout mirrors the reference floating panel:
 *   ┌───────────────────────────────────────────┐
 *   │ Free                         [Reserve]    │
 *   │ Tue, Apr 21 · 9 AM                        │
 *   └───────────────────────────────────────────┘
 *
 * When the user taps the CTA the inline TicketSelector expands and the
 * card auto-scrolls into view — important when the user clicks the
 * mobile sticky-bottom anchor or "Get tickets →" link from far up the
 * page. From there, picking quantities forwards them to
 * /events/[slug]/checkout for the full multi-step flow.
 *
 * Borderless — shadow-card only — consistent with the rest of the view.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import TicketSelector from "@/components/TicketSelector";
import { formatPrice } from "@/lib/utils";
import { minPriceCents, isFreeEvent } from "@/lib/events";

type Tier = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  quantity: number;
  sold: number;
};

type Props = {
  eventId: string;
  /** Slug used to build the /events/[slug]/checkout URL. */
  slug: string;
  tiers: Tier[];
  signedIn: boolean;
  startsAtLabel?: string;
  id?: string;
  /** When set, the headline price renders in the buyer's local currency
   *  with the original price shown as a small note. Computed server-side
   *  via the FX module so we never expose rates client-side. */
  localPrice?: { fromCents: number; currency: string } | null;
};

export default function TicketPanel({
  eventId, slug, tiers, signedIn, startsAtLabel, id, localPrice
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // When the panel expands — typically after the user taps "Reserve" or
  // the mobile sticky-bottom CTA — bring the selector into view so the
  // newly-revealed quantity steppers + Continue button aren't hidden
  // below the fold. Smooth scroll on motion-safe; no-op when reduced.
  useEffect(() => {
    if (!open || !rootRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rootRef.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start"
    });
  }, [open]);

  const currency = tiers[0]?.currency ?? "USD";
  const min = minPriceCents(tiers);
  const isFree = isFreeEvent(tiers);

  const totalQty = tiers.reduce((s, t) => s + t.quantity, 0);
  const totalRemaining = tiers.reduce((s, t) => s + Math.max(0, t.quantity - t.sold), 0);
  const soldOut = totalQty > 0 && totalRemaining === 0;

  const ctaLabel = soldOut
    ? "Join waitlist"
    : isFree
      ? "Reserve a spot"
      : tiers.length > 1 ? "Get tickets" : "Buy ticket";

  const priceHeadline = soldOut
    ? "Sold out"
    : isFree || min === null
      ? "Free"
      : (localPrice && localPrice.currency !== currency)
        ? formatPrice(localPrice.fromCents, localPrice.currency)
        : formatPrice(min, currency);

  const priceSubline = !soldOut && !isFree && min !== null && localPrice && localPrice.currency !== currency
    ? `≈ ${formatPrice(min, currency)} charged in your local currency`
    : null;

  return (
    <div
      ref={rootRef}
      id={id}
      className="rounded-md bg-white shadow-card overflow-hidden scroll-mt-24"
    >
      {/* Collapsed summary — always visible. */}
      <div className="p-4 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-nile-900 text-[17px] leading-tight truncate">
            {priceHeadline}
          </div>
          {priceSubline && (
            <div className="mt-0.5 text-[12px] text-ink-500 truncate">
              {priceSubline}
            </div>
          )}
          {startsAtLabel && (
            <div className="mt-1 text-[13px] text-ink-600 truncate">
              {startsAtLabel}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={soldOut}
          className="btn btn-primary shrink-0"
          aria-expanded={open}
          aria-controls={id ? `${id}-panel` : undefined}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Expanded tier selector — quantities only. Continuing forwards
          the buyer to /events/[slug]/checkout for the full form. */}
      {open && !soldOut && (
        <div
          id={id ? `${id}-panel` : undefined}
          className="px-4 pb-4 pt-1"
          style={{ borderTop: "1px solid var(--border-hairline)" }}
        >
          <TicketSelector
            eventId={eventId}
            slug={slug}
            signedIn={signedIn}
            dateHint={startsAtLabel}
            tiers={tiers.map((t) => ({
              id: t.id,
              name: t.name,
              priceCents: t.priceCents,
              currency: t.currency,
              remaining: Math.max(0, t.quantity - t.sold)
            }))}
          />
        </div>
      )}
    </div>
  );
}
