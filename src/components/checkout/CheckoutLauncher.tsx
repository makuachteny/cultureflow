"use client";

/**
 * CheckoutLauncher — opens the CheckoutForm popup when the URL carries
 * `?checkout=1`. Mounted on the event detail page so the modal floats
 * over the event content.
 *
 * URL convention:
 *   /events/<slug>?checkout=1&t_<tierId>=<qty>...
 *
 * The launcher reads tier-quantity selections from the query string, so
 * a deep link or sign-in callback can land users straight back into the
 * popup with their picks intact. Closing the modal removes those params
 * from the URL via router.replace, leaving a clean event-page URL behind.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import CheckoutForm from "@/components/checkout/CheckoutForm";

type Tier = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  /** Pre-clamped to `quantity - sold` by the server. */
  remaining: number;
};

type EventLite = {
  id: string;
  slug: string;
  title: string;
  bannerUrl: string | null;
  startsAt: string;
  endsAt:   string;
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
  startsAt: string;
  priceLabel: string;
  city: string | null;
  organizerName: string | null;
};

type Props = {
  event: EventLite;
  tiers: Tier[];
  /** When false the launcher just no-ops — TicketPanel handles the
   *  sign-in gate visually before the user can ever set ?checkout=1. */
  signedIn: boolean;
  defaultEmail: string;
  defaultName: string;
  /** Whether the viewer already follows this organizer — drives the
   *  initial state of the Follow button on the success view. */
  isFollowingOrganizer: boolean;
  /** Other upcoming events from the same organizer — populates the
   *  "Make more plans with these events" rail on the success view. */
  similarEvents: SimilarEvent[];
};

export default function CheckoutLauncher({
  event, tiers, signedIn, defaultEmail, defaultName,
  isFollowingOrganizer, similarEvents
}: Props) {
  const router       = useRouter();
  const pathname     = usePathname() ?? `/events/${event.slug}`;
  const searchParams = useSearchParams();

  const open = signedIn && searchParams?.get("checkout") === "1";

  const initialQty = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    if (!searchParams) return out;
    for (const tier of tiers) {
      const v = searchParams.get(`t_${tier.id}`);
      const n = v ? Number(v) : 0;
      if (Number.isFinite(n) && n > 0) {
        out[tier.id] = Math.min(Math.max(0, Math.floor(n)), Math.min(10, tier.remaining));
      }
    }
    return out;
  }, [searchParams, tiers]);

  const totalQty = Object.values(initialQty).reduce((s, n) => s + n, 0);
  if (!open || totalQty === 0) return null;

  function handleClose() {
    // Drop ALL checkout-related params (`checkout`, `t_*`) but preserve
    // anything else the user came in with (e.g. utm tags). router.replace
    // so the close doesn't pollute history.
    const next = new URLSearchParams(searchParams ?? undefined);
    next.delete("checkout");
    for (const tier of tiers) next.delete(`t_${tier.id}`);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <CheckoutForm
      event={event}
      tiers={tiers}
      initialQty={initialQty}
      defaultEmail={defaultEmail}
      defaultName={defaultName}
      isFollowingOrganizer={isFollowingOrganizer}
      similarEvents={similarEvents}
      onClose={handleClose}
    />
  );
}
