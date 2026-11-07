import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import EmptyState from "@/components/EmptyState";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CATEGORIES, FEATURED_CITIES } from "@/lib/taxonomy";
import {
  parseFilters, buildEventWhere, SORT_OPTIONS,
  type RawSearchParams
} from "@/lib/browseFilters";
import FilterSidebar from "./FilterSidebar";
import MapPanel from "./MapPanel";
import MapEventRow from "./MapEventRow";
import MobileFilters from "./MobileFilters";

export const revalidate = 60;
const PAGE_SIZE = 40;

export const metadata: Metadata = {
  title: "Events map",
  description: "Map view of upcoming events — pan to any city to see what's on near you.",
  alternates: { canonical: "/browse/map" },
  openGraph: {
    title: "Events near you",
    description: "Map view of upcoming community events around the world.",
    type: "website"
  }
};

export default async function MapBrowsePage({ searchParams }: { searchParams: RawSearchParams }) {
  const f = parseFilters(searchParams);
  const { q, cities, categories, types, prices, sort, when } = f;
  const where = buildEventWhere(f);

  const [events, total, cityFacets] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { ticketTiers: true, organizer: { select: { id: true, name: true } } },
      orderBy: SORT_OPTIONS[sort],
      take: PAGE_SIZE
    }),
    prisma.event.count({ where }),
    /* City list for the sidebar — scoped to the result set so the rail
       reflects live inventory. Active selections are merged back in by
       FilterSidebar so a tap doesn't make a row disappear. */
    prisma.event.groupBy({
      by: ["city"],
      where: { ...where, city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 12
    })
  ]);

  const availableCities = cityFacets
    .map((c) => c.city ?? "")
    .filter(Boolean);

  /* makeHref now takes single patch keys whose values are already
     URL-ready (CSV for multi-select). FilterSidebar's `toggleCsv`
     helper produces the new CSV before calling makeHref. */
  const makeHref = (patch: Record<string, string>) => {
    const qs = new URLSearchParams();
    const merged: Record<string, string> = {
      q,
      city:     cities.join(","),
      category: categories.join(","),
      type:     types.join(","),
      price:    prices.join(","),
      when,
      sort:     sort === "soon" ? "" : sort,
      ...patch
    };
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/browse/map?${s}` : "/browse/map";
  };

  /* Headline — pluralises naturally over the array shapes. Falls back
     to "Events near you" when nothing is set. */
  const firstRealCity = cities.find((c) => c.toLowerCase() !== "online");
  const resolvedCity = firstRealCity ?? (FEATURED_CITIES[0]?.label ?? "London");
  const categoryLabel = categories.length === 1
    ? CATEGORIES.find((c) => c.key === categories[0])?.label
    : null;
  const headline =
    (categoryLabel ? `${categoryLabel} events ` : "Events ") +
    (firstRealCity ? `in ${firstRealCity}` : "near you");

  /* Active-filter count powers the badge on the mobile "Filters" pill
     trigger. Counts every selection across all groups (so 3 cities + 2
     categories ⇒ 5). Date contributes 1 when set, search query 1. */
  const activeCount =
    cities.length + categories.length + types.length + prices.length +
    (when ? 1 : 0) + (q ? 1 : 0);

  /* Single container that mirrors /browse + the dashboard shell: the
     max-w-[1600px] + px-6/8/10 rhythm keeps the map view visually in
     the same family as the rest of the app. The header row and the
     3-col workspace share one wrapper so the filter sidebar starts on
     the same vertical line as the heading, not in a new strip below. */
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-8 lg:px-10 py-6 sm:py-8">
      {/* Header row — breadcrumb + title/count on the left, view toggle
          on the right. Sits tight to the 3-col below (mb-6) so there's
          no dead band between the heading and the working surface. */}
      <Breadcrumbs
        items={[
          { label: "Home",          href: "/" },
          { label: "Browse events", href: "/browse" },
          { label: "Map view" }
        ]}
      />
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold text-ink-900 tracking-tight leading-tight">
            {headline}
          </h1>
          <p className="mt-1 text-[13px] text-ink-600">
            {total.toLocaleString()} {total === 1 ? "event" : "events"} · showing up to {PAGE_SIZE}
          </p>
        </div>
        <Link
          href={{
            pathname: "/browse",
            query: cleanQuery({
              q,
              city:     cities.join(","),
              category: categories.join(","),
              type:     types.join(","),
              price:    prices.join(","),
              when,
              sort
            })
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-hairline)] bg-white h-9 px-3.5 text-[13px] font-semibold text-ink-700 hover:bg-cream-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
          Grid view
        </Link>
      </div>

      {/* Mobile-only filter trigger — opens a bottom-sheet hosting the
          same FilterSidebar markup. Hidden on lg+ where the rail lives
          inline alongside the events list and map. */}
      <div className="lg:hidden mb-4">
        <MobileFilters chipCount={activeCount}>
          <FilterSidebar
            active={{ q, cities, categories, types, prices, when }}
            makeHref={makeHref}
            availableCities={availableCities}
          />
        </MobileFilters>
      </div>

      {/* 3-col workspace: filters · events list · map. All three columns
          share the same top edge so the filter rail visually sits on
          the same baseline as the first event row. gap-6 keeps the
          columns related without the airy gaps the previous revision
          had (the old max-w-[640px] cap left a dead band between list
          and map — removed). */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="hidden lg:block">
          <FilterSidebar
            active={{ q, cities, categories, types, prices, when }}
            makeHref={makeHref}
            availableCities={availableCities}
          />
        </div>

        {/* Events list — narrow, compact rows so the map can dominate
            the remaining space. Cap keeps each card readable; the
            `MapEventRow` variant uses an 88 px thumb + single-line
            meta so the text doesn't pile up in the tighter column. */}
        <div className="w-full lg:w-[380px] xl:w-[440px] shrink-0">
          {events.length === 0 ? (
            <EmptyState
              illustration="spark"
              title="No events match those filters"
              body="Try loosening a filter, or switch to grid view to see everything in this area."
              primary={{ label: "Clear filters", href: "/browse/map" }}
            />
          ) : (
            <ul className="divide-y divide-[color:var(--border-hairline)] rounded-md border border-[color:var(--border-hairline)] bg-white">
              {events.map((e) => (
                <li key={e.id}>
                  <MapEventRow event={e} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Map — flexes to fill the rest of the row, so on wide
            screens it's the dominant surface (which is the point of
            the map view). Hidden below `lg` because the split stops
            earning its keep on tablet-sized windows. */}
        <div className="hidden lg:block flex-1 min-w-0">
          <MapPanel city={resolvedCity} />
        </div>
      </div>
    </div>
  );
}

/* strip empty string values so Next's typed href stays clean */
function cleanQuery(obj: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) if (v) out[k] = v;
  return out;
}
