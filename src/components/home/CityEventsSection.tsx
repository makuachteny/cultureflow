// "Browsing events in [City] ▾" section — local-first event rail.
// Server component: reads city + time filter from query string, renders the
// interactive location picker on top, tabs, and a city-filtered event grid.

import Link from "next/link";
import { prisma } from "@/lib/db";
import EventCard from "@/components/EventCard";
import LocationPicker from "@/components/LocationPicker";

const TABS: Array<{ key: "all" | "for-you" | "today" | "weekend"; label: string }> = [
  { key: "all",      label: "All" },
  { key: "for-you",  label: "For you" },
  { key: "today",    label: "Today" },
  { key: "weekend",  label: "This weekend" }
];

function rangeFor(key: "all" | "for-you" | "today" | "weekend") {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (key === "today") {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 1);
    return { gte: startOfToday, lt: end };
  }
  if (key === "weekend") {
    // Next Sat 00:00 → next Mon 00:00 in local time.
    const d = new Date(startOfToday);
    const day = d.getDay(); // 0 Sun … 6 Sat
    const toSat = (6 - day + 7) % 7;
    const start = new Date(d); start.setDate(d.getDate() + toSat);
    const end = new Date(start); end.setDate(start.getDate() + 2);
    return { gte: start, lt: end };
  }
  // "all" and "for-you" → anything upcoming
  return { gte: now };
}

type Props = {
  city: string;
  cities: string[];
  when: "all" | "for-you" | "today" | "weekend";
};

export default async function CityEventsSection({ city, cities, when }: Props) {
  const range = rangeFor(when);
  const events = await prisma.event.findMany({
    where: {
      status:   "PUBLISHED",
      city:     { equals: city, mode: "insensitive" },
      startsAt: range,
      // Belt-and-brace alongside status:PUBLISHED — exclude any event
      // whose end date has passed even if the cron hasn't flipped it.
      endsAt:   { gte: new Date() }
    },
    include: { ticketTiers: true },
    orderBy: { startsAt: "asc" },
    take: 8
  });

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
      {/* Location picker header */}
      <div className="mb-3">
        <LocationPicker currentCity={city} cities={cities} />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-5 border-b border-[color:var(--border-hairline)] overflow-x-auto">
        {TABS.map((t) => {
          const isActive = t.key === when;
          const href =
            t.key === "all"
              ? `/?city=${encodeURIComponent(city)}`
              : `/?city=${encodeURIComponent(city)}&when=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={
                "inline-flex items-center px-0.5 pb-2.5 pt-1 text-[14px] font-semibold transition-colors whitespace-nowrap border-b-2 " +
                (isActive
                  ? "text-nile border-nile"
                  : "text-ink-700 border-transparent hover:text-nile")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Section title — large, dark, bold + "Explore more events" link on
          the right. Matches the SectionHeader pattern used elsewhere on
          the home page. */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-[24px] md:text-[28px] font-bold tracking-tight text-ink-900 leading-tight">
          Events in {city}
        </h2>
        <Link
          href={`/browse?city=${encodeURIComponent(city)}`}
          className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-nile hover:text-nile-700 motion-safe:transition-colors"
        >
          <span className="border-b-[1.5px] border-transparent group-hover:border-nile-700 motion-safe:transition-colors pb-0.5">
            Explore more events
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 motion-safe:transition-transform group-hover:translate-x-1"
            fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-ink/70">
            No upcoming events in {city}{when !== "all" ? ` for this filter` : ""} yet.
          </p>
          <Link href="/events/new" className="btn btn-primary btn-sm mt-3">
            Host the first one
          </Link>
        </div>
      ) : (
        <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-5 flex justify-center">
          <Link
            href={`/browse?city=${encodeURIComponent(city)}`}
            className="btn btn-sm btn-ghost"
          >
            See all events in {city} →
          </Link>
        </div>
      )}
    </section>
  );
}
