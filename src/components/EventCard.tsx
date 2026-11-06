import Link from "next/link";
import Image from "next/image";
import {
  formatEventDate,
  eventBadge,
  badgeClasses,
  priceLabel,
  venueString
} from "@/lib/events";
import CategoryGlyph from "@/components/CategoryGlyph";
import EventCardActions from "@/components/EventCardActions";

/**
 * EventCard — quiet, marketplace-style event tile.
 *
 * Layouts
 *   • Mobile (xs)  — horizontal "list" tile, image-left + compact text.
 *   • sm: and up   — vertical card, landscape image-on-top, meta below.
 *
 * Body anatomy (stripped to the essentials, top → bottom)
 *   1. Title         — sans-bold, `leading-[1.3]`, sentence-case.
 *   2. Status label  — soft tinted pill (Almost full / Sales end soon /
 *                       Going fast / etc.). The only coloured element.
 *   3. Date · time   — single clean line via `formatEventDate()`:
 *                       "Saturday · 7:00 PM" near-term,
 *                       "Tue, May 19 · 6:00 PM" further out.
 *   4. Venue         — quiet ink-700.
 *   5. Price         — bold tabular figure, ink-900.
 *
 *   No category eyebrow caps in the body — the type signal lives at
 *   section level (page header / category page).
 *
 *   ink-900 = title + price (emphatic)
 *   ink-700 = date, venue (supporting meta)
 *
 *   • Image: `rounded-xl` + hairline ring at rest; lift −1 px /
 *     `shadow-card` / nile-tinted ring on hover, all on a 400 ms
 *     ease-out so the motion reads as one unified gesture.
 *   • Empty-state placeholder shows the category glyph in white over
 *     the gold→nile sweep — every "no banner" card still reads as part
 *     of the family.
 */
type Tier = { priceCents: number; currency: string; quantity: number; sold: number };
type Event = {
  id: string; slug: string; title: string; summary: string;
  bannerUrl: string | null;
  city: string | null; country: string | null; venueName?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  createdAt?: Date | string | null;
  category: string;
  featured?: boolean;
  status?: string | null;
  type?: "IN_PERSON" | "ONLINE" | "HYBRID" | null;
  ticketTiers: Tier[];
};

/** Hard shadow tones for cards (sm:+ only), keyed by category. Full
 *  class strings so Tailwind's JIT picks them up. */
const CARD_SHADOWS = [
  "sm:shadow-hard-red",
  "sm:shadow-hard-blue",
  "sm:shadow-hard-green",
  "sm:shadow-hard-yellow"
];

export default function EventCard({
  event,
  liked
}: {
  event: Event;
  /** Initial like-state for the heart icon in the hover-revealed action
   *  cluster. When omitted (no signed-in user), the heart still renders
   *  but routes to `/sign-in` on click. */
  liked?: boolean;
}) {
  const status = eventBadge({
    status:      event.status,
    featured:    event.featured ?? false,
    type:        event.type,
    startsAt:    event.startsAt,
    endsAt:      event.endsAt ?? null,
    createdAt:   event.createdAt ?? null,
    ticketTiers: event.ticketTiers
  });
  const price   = priceLabel(event.ticketTiers);
  const venue   = venueString(event, "Online");
  const date    = formatEventDate(event.startsAt);
  const catSlug = event.category.toLowerCase();

  const statusClasses = status ? badgeClasses(status.tone) : "";
  // Each category gets a flag colour for the card's hard shadow, so a
  // grid of cards reads as a colourful bead pattern rather than a wall
  // of identical tiles.
  const shadowTone = CARD_SHADOWS[
    [...catSlug].reduce((n, ch) => n + ch.charCodeAt(0), 0) % CARD_SHADOWS.length
  ];

  return (
    <Link
      href={`/events/${event.slug}`}
      className={
        "group flex sm:flex-col items-stretch gap-3 sm:gap-0 sm:h-full sm:bg-white sm:border-2 sm:border-ink " +
        shadowTone + " " +
        "motion-safe:sm:transition-transform motion-safe:sm:duration-150 sm:hover:-translate-x-1 sm:hover:-translate-y-1 " +
        "active:opacity-90 sm:active:opacity-100"
      }
    >
      {/* ── Image ──
       *  Mobile: a fixed 96-px square thumb so each card occupies a
       *  predictable two-line height in a list — far more compact than
       *  the previous proportional-width tile that grew with viewport.
       *  This keeps eight cards on screen at once instead of three.
       *  sm:+: 16:10 banner on top, hairline ring at rest, ring-tints +
       *  −1 px lift + `shadow-card` on hover, all on a 400 ms ease-out so
       *  the motion reads as one unified gesture. */}
      <div
        className={
          "relative w-[96px] h-[96px] sm:w-auto sm:h-auto shrink-0 sm:shrink " +
          "sm:aspect-[16/10] overflow-hidden bg-nile-50 " +
          "border-2 border-ink sm:border-0 sm:border-b-2"
        }
      >
        {event.bannerUrl ? (
          <Image
            src={event.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 96px, (max-width: 1024px) 50vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="bg-event-placeholder absolute inset-0 flex items-center justify-center">
            <span className="text-white">
              <span className="sm:hidden"><CategoryGlyph slug={catSlug} size={32} /></span>
              <span className="hidden sm:inline"><CategoryGlyph slug={catSlug} size={56} /></span>
            </span>
          </div>
        )}

        {/* Hover-revealed action cluster — like / share / more menu.
            Faded out at rest on `sm:+`, fades in on `group-hover` and
            `group-focus-within`. Always visible on touch viewports. */}
        <EventCardActions
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          initialLiked={liked}
        />
      </div>

      {/* ── Body ──
       *  Mobile: dense column — 96-px image + 96-px tall meta column.
       *    Title (1 line clamp on mobile), date, venue, price each on
       *    their own ~16-px line so the card is exactly the height of
       *    the thumb. Tighter than the previous space-y-2.
       *  sm:+ : same rhythm at `space-y-1.5`. */}
      <div className="min-w-0 flex-1 sm:p-4 flex flex-col sm:block space-y-0.5 sm:space-y-1.5">
        {/* Title — display-font extra-bold on `sm:+`, `leading-[1.2]`
            so two clamped lines read as one block. Hover shifts to
            nile-700 with a smooth 400 ms transition that matches the
            image's hover motion duration. */}
        <h3
          className={
            "text-[14px] sm:text-[17px] font-bold sm:font-black " +
            "sm:font-display leading-[1.25] sm:leading-[1.15] " +
            "text-ink line-clamp-1 sm:line-clamp-2 group-hover:underline decoration-2 underline-offset-2"
          }
        >
          {event.title}
        </h3>

        {/* Status label — desktop only. On mobile we keep the meta
            column tight and let the date/venue/price triplet earn
            the space; the status pill returns at sm:+. */}
        {status && (
          <span
            className={
              "hidden sm:inline-flex self-start items-center border-[1.5px] border-ink px-2 py-0.5 " +
              "text-[11px] font-semibold " + statusClasses
            }
            title={`${status.label} — based on current ticket sales.`}
          >
            {status.label}
          </span>
        )}

        {/* Date — single clean row: "Saturday · 7:00 PM" /
            "Tue, May 19 · 6:00 PM" / "Today · 9:00 AM". */}
        <div className="hidden sm:block text-[13.5px] font-medium text-ink-700 leading-tight truncate">
          {date}
        </div>

        {/* Mobile date — smaller and tabular for clean alignment. */}
        <div className="sm:hidden text-[12px] font-medium text-ink-700 leading-tight truncate">
          {date}
        </div>

        {/* Venue — desktop. */}
        <div className="hidden sm:block text-[13.5px] text-ink-700 leading-tight truncate">
          {venue}
        </div>

        {/* Mobile venue. */}
        <div className="sm:hidden text-[12px] text-ink-500 leading-tight truncate">
          {venue}
        </div>

        {/* Price — bold tabular figure on its own line. */}
        <div className="pt-0.5 sm:pt-2">
          <span className="text-[13px] sm:text-[14px] font-bold font-tabular leading-tight text-ink sm:inline-block sm:bg-gold sm:border-2 sm:border-ink sm:px-2 sm:py-0.5">
            {price}
          </span>
        </div>
      </div>
    </Link>
  );
}
