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

  return (
    <Link
      href={`/events/${event.slug}`}
      className={
        "group block rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30 " +
        "active:opacity-90 sm:active:opacity-100 flex sm:block items-stretch gap-3 sm:gap-0"
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
          "sm:aspect-[16/10] overflow-hidden rounded-lg sm:rounded-xl " +
          "bg-nile-50 ring-1 ring-black/5 " +
          "motion-safe:sm:transition-[transform,box-shadow,ring-color] motion-safe:sm:duration-[400ms] " +
          "motion-safe:sm:ease-out " +
          "motion-safe:sm:group-hover:-translate-y-1 " +
          "sm:group-hover:ring-nile/30 sm:group-hover:shadow-card"
        }
      >
        {event.bannerUrl ? (
          <Image
            src={event.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 96px, (max-width: 1024px) 50vw, 320px"
            className="object-cover motion-safe:transition-transform motion-safe:duration-[600ms] motion-safe:ease-out sm:group-hover:scale-[1.04]"
          />
        ) : (
          <div className="bg-event-placeholder absolute inset-0 flex items-center justify-center">
            <span className="text-white/95 drop-shadow">
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
      <div className="min-w-0 flex-1 sm:mt-3.5 sm:px-0.5 flex flex-col sm:block space-y-0.5 sm:space-y-1.5">
        {/* Title — display-font extra-bold on `sm:+`, `leading-[1.2]`
            so two clamped lines read as one block. Hover shifts to
            nile-700 with a smooth 400 ms transition that matches the
            image's hover motion duration. */}
        <h3
          className={
            "text-[14px] sm:text-[16.5px] font-bold sm:font-extrabold " +
            "sm:font-display leading-[1.25] sm:leading-[1.2] tracking-tight sm:tracking-[-0.01em] " +
            "text-ink-900 line-clamp-1 sm:line-clamp-2 motion-safe:transition-colors " +
            "motion-safe:duration-[400ms] motion-safe:ease-out group-hover:text-nile-700"
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
              "hidden sm:inline-flex self-start items-center rounded-md px-2 py-0.5 " +
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
        <div className="pt-0.5 sm:pt-1 text-[13px] sm:text-[14px] font-bold font-tabular leading-tight tracking-tight text-ink-900">
          {price}
        </div>
      </div>
    </Link>
  );
}
