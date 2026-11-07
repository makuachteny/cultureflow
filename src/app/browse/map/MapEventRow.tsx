import Link from "next/link";
import Image from "next/image";
import {
  formatEventDate,
  priceLabel,
  isFreeEvent,
  venueString,
  categoryLabel
} from "@/lib/events";

/**
 * Compact event row for the map view's list column. The map page's
 * list is intentionally narrow (~440 px) so the map can dominate the
 * remaining space, which means the full-fat `<EventRow />` — with its
 * 200–240 px thumbnail and multi-line snippet — doesn't fit without
 * truncation pile-up. This component keeps the same information
 * hierarchy but shrinks the thumb to 88 px and trims the meta lines
 * to title · category · date · venue · price.
 */

type Tier = { priceCents: number; currency: string; quantity: number; sold: number };
type Props = {
  event: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    bannerUrl: string | null;
    city: string | null;
    country: string | null;
    venueName?: string | null;
    startsAt: Date | string;
    category: string;
    ticketTiers: Tier[];
  };
};

export default function MapEventRow({ event }: Props) {
  const price = priceLabel(event.ticketTiers);
  const free  = isFreeEvent(event.ticketTiers);
  const venue = venueString(event, "Venue TBA");
  const date  = formatEventDate(event.startsAt);
  const cat   = categoryLabel(event.category);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex items-start gap-3 px-3 py-3 hover:bg-cream-100/60 focus-visible:bg-cream-100/60 focus-visible:outline-none transition-colors"
    >
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-md bg-nile-50">
        {event.bannerUrl ? (
          <Image
            src={event.bannerUrl}
            alt=""
            fill
            sizes="88px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-event-placeholder">
            <Image src="/logo-mark.svg" alt="" width={26} height={28} className="opacity-90" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold leading-snug text-ink-900 line-clamp-2 group-hover:text-nile transition-colors">
          {event.title}
        </h3>

        {cat && (
          <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">
            {cat}
          </div>
        )}

        <div className="mt-1.5 text-[12px] text-ink-700 leading-snug line-clamp-1">
          {date}
        </div>
        <div className="text-[12px] text-ink-600 leading-snug line-clamp-1">
          {venue}
        </div>

        <div className={"mt-1 text-[12.5px] font-bold font-tabular " + (free ? "text-acacia-700" : "text-ink-900")}>
          {price}
        </div>
      </div>
    </Link>
  );
}
