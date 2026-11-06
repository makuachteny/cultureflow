import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EventCard from "@/components/EventCard";
import EventRow from "@/components/EventRow";
import EmptyState from "@/components/EmptyState";
import Breadcrumbs from "@/components/Breadcrumbs";
import AutoSubmitSelect from "@/components/browse/AutoSubmitSelect";
import ThemedHero from "@/components/browse/ThemedHero";
import { CATEGORIES, FEATURED_CITIES } from "@/lib/taxonomy";
import { resolveTheme } from "@/lib/browseThemes";
import LocationPicker from "@/components/LocationPicker";
import PromoCard from "@/components/browse/PromoCard";
import { defaultCityForRequest } from "@/lib/geo";
import {
  parseFilters, buildEventWhere, SORT_OPTIONS, WHEN_LABEL,
  type RawSearchParams, type WhenKey
} from "@/lib/browseFilters";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Browse events",
  description: "Discover upcoming events — filter by category, city, and date. Find cultural nights, weddings, fundraisers, music, sports and more.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse events",
    description: "Find upcoming events in your city and online.",
    type: "website"
  }
};

/* View toggle is unique to this page (map + list live elsewhere), so
 * it's validated here rather than in the shared browseFilters module. */
const VIEW_OPTIONS: ReadonlySet<string> = new Set(["grid", "list"]);
type ViewKey = "grid" | "list";

type SP = RawSearchParams & { page?: string; view?: string };
const PAGE_SIZE_GRID = 24;
const PAGE_SIZE_LIST = 20;

export default async function BrowsePage({ searchParams }: { searchParams: SP }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const view: ViewKey = VIEW_OPTIONS.has(searchParams.view ?? "")
    ? (searchParams.view as ViewKey) : "grid";

  /* ────────── Default city = viewer's area ──────────
   *
   * When the URL has no `?city=` filter, scope to the viewer's saved
   * profile city (if signed in) or the country-derived default. Empty
   * URL → relevant local results, not a 24-card global grid. The
   * URL doesn't get rewritten, so applying a different filter or
   * clearing the city via the LocationPicker still works as expected. */
  const session = await auth();
  const profileCity = session?.user?.id
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { city: true } }))?.city ?? null
    : null;

  const f0 = parseFilters(searchParams);
  const cityProvided = Boolean(searchParams.city ?? "");
  const cityDefault  = profileCity ?? defaultCityForRequest();
  const f = cityProvided ? f0 : { ...f0, city: cityDefault };
  const { q, city, category, type, price, sort, when } = f;
  const where = buildEventWhere(f);

  const PAGE_SIZE = view === "list" ? PAGE_SIZE_LIST : PAGE_SIZE_GRID;
  const skip = (page - 1) * PAGE_SIZE;
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { ticketTiers: true, organizer: { select: { id: true, name: true } } },
      orderBy: SORT_OPTIONS[sort],
      skip,
      take: PAGE_SIZE
    }),
    prisma.event.count({ where })
  ]);

  // Which events on this page does the viewer already like? We only
  // scope the query to the page's ids so a signed-in user who's liked
  // thousands of events doesn't pay to load all of them just to paint
  // the heart state on a 24-card grid.
  const likedSet: Set<string> = session?.user?.id && events.length > 0
    ? new Set(
        (await prisma.like.findMany({
          where: { userId: session.user.id, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true }
        })).map((l) => l.eventId)
      )
    : new Set();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(q || city || category || type || price || when || sort !== "soon");

  /* ────────── Themed hero ──────────
     When a single category OR a featured city is active, render a bespoke
     hero banner that sets the visual tone for the whole page. Falls back
     to the plain breadcrumb + picker header when neither is set. */
  const theme = resolveTheme({ category, city });

  /* ────────── Build an href that preserves current filters ────────── */
  const makeHref = (patch: Record<string, string>) => {
    const qs = new URLSearchParams();
    const merged = {
      q, city, category, type, price,
      when,
      view: view === "grid" ? "" : view,
      sort: sort === "soon" ? "" : sort,
      ...patch
    };
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/browse?${s}` : "/browse";
  };

  // Chips for the "applied filters" row.
  // City is intentionally NOT chipped — the LocationPicker above
  // ("Browsing events in <City> ▾") already surfaces it; repeating
  // it here just adds noise and confuses people about how to clear it.
  // Cities still get cleared by switching/clearing via the picker.
  const chips: Array<{ label: string; removeHref: string; key: string }> = [];
  if (q)        chips.push({ key: "q",        label: `"${q}"`,                       removeHref: makeHref({ q: "", page: "" }) });
  if (category) chips.push({ key: "category", label: CATEGORIES.find((c) => c.key === category)?.label ?? category,
                                                                                     removeHref: makeHref({ category: "", page: "" }) });
  if (type)     chips.push({ key: "type",     label: type === "IN_PERSON" ? "In person" : type === "ONLINE" ? "Online" : "Hybrid",
                                                                                     removeHref: makeHref({ type: "", page: "" }) });
  if (price)    chips.push({ key: "price",    label: price === "free" ? "Free" : "Paid",
                                                                                     removeHref: makeHref({ price: "", page: "" }) });
  if (when)     chips.push({ key: "when",     label: WHEN_LABEL[when],               removeHref: makeHref({ when: "", page: "" }) });

  // Quick-tabs (mirror the homepage) — All / Today / Weekend / etc.
  const TAB_DEFS: Array<{ key: "" | WhenKey; label: string }> = [
    { key: "",          label: "All" },
    { key: "today",     label: "Today" },
    { key: "tomorrow",  label: "Tomorrow" },
    { key: "weekend",   label: "This weekend" },
    { key: "this-week", label: "This week" }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 sm:pb-14 lg:pb-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Browse events" }
        ]}
      />

      {theme && (
        <div className="mt-8 sm:mt-10 mb-12 sm:mb-16">
          <ThemedHero theme={theme} resultCount={total} />
        </div>
      )}

      {/* ─── Platform promo ─── *
       *  Sits at the top of the page (under the hero, above the picker) so
       *  it's the second thing visitors see. Hidden the moment any filter,
       *  tab, or sort is engaged so it never competes with search intent. */}
      {page === 1
        && !hasFilters
        && Object.keys(searchParams ?? {}).length === 0
        && events.length > 0 && (
        <div className="mt-8 sm:mt-10 mb-12 sm:mb-16">
          <PromoCard />
        </div>
      )}

      {/* Picker + result count share one row — saves ~40px of vertical space
          and puts the city and the total in the same eye line. Search lives
          in the global Header. */}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <LocationPicker
          currentCity={city && city.toLowerCase() !== "online" ? city : (FEATURED_CITIES[0]?.label ?? "London")}
          cities={FEATURED_CITIES.map((c) => c.label)}
        />
        <span className="text-[12px] text-ink-500 font-tabular" aria-live="polite" aria-atomic="true">
          {total.toLocaleString()} {total === 1 ? "event" : "events"}
        </span>
      </div>

      {/* Quick-tabs sit directly under the picker — no extra margin. The
          border-b acts as the visual divider, so mt-2 is enough. */}
      <div className="mt-2 flex items-center gap-5 border-b border-[color:var(--border-hairline)] overflow-x-auto">
        {TAB_DEFS.map((t) => {
          const isActive = t.key === when;
          return (
            <Link
              key={t.key || "all"}
              href={makeHref({ when: t.key, page: "" })}
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

      {/* ─── Filter chip row + view toggle + sort ─────────────────────
           One height (h-9 / 36px), one radius (rounded-full), one type
           ramp (13px / semibold). Every control on this row reads as a
           sibling of the others — same family as Header search pill,
           welcome-wizard chips, and applied-filter chips. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <InlineSelect name="category" defaultValue={category} label="Category" makeHref={makeHref}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </InlineSelect>
        <InlineSelect name="type" defaultValue={type} label="Format" makeHref={makeHref}>
          <option value="">Any format</option>
          <option value="IN_PERSON">In person</option>
          <option value="ONLINE">Online</option>
          <option value="HYBRID">Hybrid</option>
        </InlineSelect>
        <InlineSelect name="price" defaultValue={price} label="Price" makeHref={makeHref}>
          <option value="">Any price</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </InlineSelect>

        {/* View toggle + sort — same h-9 pill family. Left-aligned on
            mobile so it sits flush with the category/format/price pills
            on the row above; pushed to the right edge on sm:+ where the
            row has horizontal real-estate to spare. */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <div
            role="group"
            aria-label="Event layout"
            className="inline-flex h-9 rounded-full border border-[color:var(--border-hairline)] bg-white overflow-hidden"
          >
            <Link
              href={makeHref({ view: "", page: "" })}
              aria-label="Grid view"
              aria-current={view === "grid" ? "true" : undefined}
              className={
                "inline-flex items-center gap-1.5 px-3.5 text-[13px] font-semibold motion-safe:transition-colors " +
                (view === "grid" ? "bg-nile-50 text-nile" : "text-ink-700 hover:bg-nile-50/60")
              }
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
              Grid
            </Link>
            <Link
              href={makeHref({ view: "list", page: "" })}
              aria-label="List view"
              aria-current={view === "list" ? "true" : undefined}
              className={
                "inline-flex items-center gap-1.5 px-3.5 text-[13px] font-semibold border-l border-[color:var(--border-hairline)] motion-safe:transition-colors " +
                (view === "list" ? "bg-nile-50 text-nile" : "text-ink-700 hover:bg-nile-50/60")
              }
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              List
            </Link>
            {/* Map view lives on its own route — the split layout needs
                full viewport width, which this bounded container can't
                supply. Preserve current filters in the jump. */}
            <Link
              href={(() => {
                const qs = new URLSearchParams();
                for (const [k, v] of Object.entries({
                  q, city, category, type, price, when,
                  sort: sort === "soon" ? "" : sort
                })) if (v) qs.set(k, v);
                const s = qs.toString();
                return s ? `/browse/map?${s}` : "/browse/map";
              })()}
              aria-label="Map view"
              className="inline-flex items-center gap-1.5 px-3.5 text-[13px] font-semibold border-l border-[color:var(--border-hairline)] text-ink-700 hover:bg-nile-50/60 motion-safe:transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3-6-3z" />
                <path d="M9 4v13M15 7v13" />
              </svg>
              Map
            </Link>
          </div>
          <form action="/browse" method="GET" className="inline-flex">
            {q        && <input type="hidden" name="q"        value={q} />}
            {city     && <input type="hidden" name="city"     value={city} />}
            {category && <input type="hidden" name="category" value={category} />}
            {type     && <input type="hidden" name="type"     value={type} />}
            {price    && <input type="hidden" name="price"    value={price} />}
            {when     && <input type="hidden" name="when"     value={when} />}
            {view !== "grid" && <input type="hidden" name="view" value={view} />}
            <AutoSubmitSelect
              name="sort"
              defaultValue={sort}
              className="h-9 w-[160px] rounded-full border border-[color:var(--border-hairline)] bg-white pl-3 pr-7 text-[12.5px] font-semibold text-ink-700 cursor-pointer focus:outline-none focus:border-nile hover:border-[color:var(--border-strong)] motion-safe:transition-colors"
              aria-label="Sort"
            >
              <option value="soon">Sort: Soonest</option>
              <option value="latest">Sort: Recently added</option>
              <option value="popular">Sort: Most viewed</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      {/* Applied-filter chip row — only appears when filters are active,
          so it never steals vertical space from an empty state. Matches
          the h-9 pill family the row above uses. */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500 mr-1">
            {chips.length} filter{chips.length > 1 ? "s" : ""}
          </span>
          {chips.map((c) => (
            <Link
              key={c.key}
              href={c.removeHref}
              aria-label={`Remove filter: ${c.label}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-nile bg-nile-50 pl-3 pr-2 text-[12.5px] font-semibold text-nile hover:bg-nile-100 motion-safe:transition-colors"
            >
              {c.label}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-nile-700" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </span>
            </Link>
          ))}
          <Link href="/browse" className="ml-auto text-[13px] font-semibold text-nile hover:underline">
            Clear all
          </Link>
        </div>
      )}

      {/* Section title lives inside the LocationPicker above — no duplicate
          "Events in [city]" heading here. Result count sits beside the picker. */}

      {/* ─── Results ─── */}
      {events.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            illustration="spark"
            title="No events match those filters"
            body="Try loosening a filter, or be the first to host something in this space."
            primary={{ label: "Host an event", href: "/events/new" }}
            secondary={hasFilters ? { label: "Clear filters", href: "/browse" } : undefined}
          />
        </div>
      ) : view === "list" ? (
        <div className="mt-2 divide-y divide-[color:var(--border-hairline)]">
          {events.map((e) => (
            <EventRow key={e.id} event={{ ...e, organizer: e.organizer }} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              liked={session?.user?.id ? likedSet.has(e.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center items-center gap-1.5" aria-label="Pagination">
          {page > 1 && (
            <Link href={makeHref({ page: String(page - 1) })} className="btn btn-sm btn-ghost" aria-label="Previous page">
              ← Prev
            </Link>
          )}
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const show = n === 1 || n === totalPages || Math.abs(n - page) <= 1;
            if (!show) {
              if (n === 2 || n === totalPages - 1) return <span key={n} className="px-1 text-ink-500 text-[13px]">…</span>;
              return null;
            }
            return (
              <Link
                key={n}
                href={makeHref({ page: String(n) })}
                aria-current={n === page ? "page" : undefined}
                className={`btn btn-sm ${n === page ? "btn-primary" : "btn-ghost"}`}
              >
                {n}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={makeHref({ page: String(page + 1) })} className="btn btn-sm btn-ghost" aria-label="Next page">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/* ────────── InlineSelect — a pill-style <select> that auto-submits on change.
   Preserves every other filter via hidden inputs constructed from makeHref's
   current state. ────────── */
function InlineSelect({
  name, defaultValue, label, makeHref, children
}: {
  name: "category" | "type" | "price";
  defaultValue: string;
  label: string;
  makeHref: (patch: Record<string, string>) => string;
  children: React.ReactNode;
}) {
  const active = !!defaultValue;
  // Derive a full GET form by reading the querystring that `makeHref({})` builds.
  // We just need the preserved params — we'll construct them as hidden inputs.
  const base = makeHref({ [name]: "__PLACEHOLDER__", page: "" });
  const qs = new URLSearchParams(base.includes("?") ? base.split("?")[1] : "");
  qs.delete(name);
  qs.delete("page");

  return (
    <form action="/browse" method="GET" className="inline-flex">
      {[...qs.entries()].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="sr-only">{label}</label>
      <AutoSubmitSelect
        name={name}
        defaultValue={defaultValue}
        className={
          "h-9 w-[130px] rounded-full border pl-3 pr-7 text-[12.5px] font-semibold cursor-pointer focus:outline-none motion-safe:transition-colors " +
          (active
            ? "bg-nile-50 border-nile text-nile"
            : "bg-white border-[color:var(--border-hairline)] text-ink-700 hover:border-[color:var(--border-strong)]")
        }
      >
        {children}
      </AutoSubmitSelect>
    </form>
  );
}

/* `titleForFilters` removed — the LocationPicker headline already reads
   "Browsing events in [City]", so a second H1 would duplicate it. If a
   future variant needs a prose title (e.g. "Cultural events this weekend
   in London"), reinstate from git history. */
