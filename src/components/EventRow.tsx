import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import {
  formatEventDate,
  eventBadge,
  badgeClasses,
  priceLabel,
  isFreeEvent,
  venueString,
  categoryLabel
} from "@/lib/events";
import CategoryGlyph from "@/components/CategoryGlyph";

/**
 * EventRow — flat, editorial list-view of an event.
 *
 * Unlike the previous incarnation (rounded-card with shadow), rows are
 * now plain content blocks separated by hairlines on the browse list
 * page — same treatment as a newspaper listings section. A generous
 * left image (240px / 4:3) and a 1-line summary snippet give each row
 * room to breathe without the card-chrome noise.
 */

type Tier = { priceCents: number; currency: string; quantity: number; sold: number };
type Organizer = { id: string; name: string | null };
type Row = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bannerUrl: string | null;
  city: string | null;
  country: string | null;
  venueName?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  createdAt?: Date | string | null;
  category: string;
  featured?: boolean;
  status?: string | null;
  type?: "IN_PERSON" | "ONLINE" | "HYBRID";
  organizer?: Organizer | null;
  ticketTiers: Tier[];
};

export default function EventRow({ event }: { event: Row }) {
  const status = eventBadge({
    status:      event.status,
    featured:    event.featured ?? false,
    type:        event.type,
    startsAt:    event.startsAt,
    endsAt:      event.endsAt ?? null,
    createdAt:   event.createdAt ?? null,
    ticketTiers: event.ticketTiers
  });
  const price  = priceLabel(event.ticketTiers);
  const isFree = isFreeEvent(event.ticketTiers);
  const venue  = venueString(event, "Venue TBA");
  const date   = formatEventDate(event.startsAt);
  const catTxt = categoryLabel(event.category);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex gap-3.5 sm:gap-5 lg:gap-6 py-4 sm:py-5 rounded-md motion-safe:transition-colors hover:bg-cream-100/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30 px-2 -mx-2 active:bg-cream-100/80 sm:active:bg-transparent"
    >
      {/* Image — wider + squarer so the row reads as a poster entry.
          Narrows to 108px on xs viewports so the body has room to breathe
          on phones; scales up at sm: / lg: for desktop list views. */}
      <div className="relative w-[108px] sm:w-[200px] lg:w-[240px] shrink-0 aspect-[4/3] overflow-hidden rounded-md bg-nile-50">
        {event.bannerUrl ? (
          <Image
            src={event.bannerUrl}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 108px, (max-width: 1024px) 200px, 240px"
            className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="bg-event-placeholder absolute inset-0 flex items-center justify-center">
            <Image src="/logo-mark.svg" alt="" width={70} height={48} className="opacity-90" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1 flex flex-col py-0.5">
        {/* Title */}
        <h3 className="text-[15.5px] sm:text-[19px] font-bold leading-snug tracking-tight text-ink-900 line-clamp-2 group-hover:text-nile motion-safe:transition-colors">
          {event.title}
        </h3>

        {/* Summary snippet (1 line) — desktop only. */}
        {event.summary && (
          <p className="mt-1.5 text-[13.5px] text-ink-700 leading-relaxed line-clamp-1 hidden sm:block">
            {event.summary}
          </p>
        )}

        {/* Event type — sits below the description so the title + blurb
            stay tight together, then the type anchors the meta below.
            Hidden on xs to keep the row tight; visible from sm: up. */}
        {catTxt && (
          <div className="hidden sm:flex mt-2 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-900">
            <span className="text-ink-500">
              <CategoryGlyph slug={event.category.toLowerCase()} size={14} />
            </span>
            {catTxt}
          </div>
        )}

        {/* Calendar + venue meta rows */}
        <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1 text-[12.5px] sm:text-[13.5px] text-ink-900">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-ink-500"><Icon name="calendar" size={14} /></span>
            <span className="truncate font-medium">{date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-ink-500"><Icon name="pin" size={14} /></span>
            <span className="truncate">{venue}</span>
          </div>
        </div>

        {/* Footer row — price + organizer + optional chip.
            Organizer hidden on xs to leave room for the price + status chip
            (the two pieces of info that drive the click). */}
        <div className="mt-auto pt-2 sm:pt-3 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5">
          <span className={
            "text-[13px] font-bold font-tabular " +
            (isFree ? "text-acacia-600" : "text-ink-900")
          }>
            {price}
          </span>

          {event.organizer?.name && (
            <span className="hidden sm:inline text-[12px] text-ink-500 truncate max-w-[220px]">
              By <span className="font-semibold text-ink-700">{event.organizer.name}</span>
            </span>
          )}

          {/* Status chip sits at the end so it anchors the right side on
              wide rows, or wraps below on narrow ones. Uses the shared
              `badgeClasses()` palette so EventCard and EventRow stay
              visually consistent across the five tones (hot, warn, info,
              editorial, stop). */}
          {status && (
            <span
              className={
                "ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold " +
                badgeClasses(status.tone)
              }
              title={status.label}
            >
              {status.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
