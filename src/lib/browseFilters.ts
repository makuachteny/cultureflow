/**
 * Shared browse filter logic — single source of truth used by both
 * /browse (grid + list view) and /browse/map.
 *
 * Exposes:
 *   • Allow-list sets for querystring validation
 *   • `whenRange(when)` — date-window computation for presets
 *   • `parseFilters(sp)` — normalizes a raw searchParams object into a
 *     typed, validated filter bag
 *   • `buildEventWhere(filters)` — produces a Prisma `Event.where`
 *   • `WHEN_LABEL`, `SORT_OPTIONS`, `SortKey`, `WhenKey`, `EventType`
 *
 * Previously duplicated across two page files (~80 lines each).
 */

import type { Prisma, EventCategory } from "@prisma/client";
import { CATEGORIES } from "@/lib/taxonomy";

export const CATEGORY_KEYS: ReadonlySet<string> = new Set(CATEGORIES.map((c) => c.key));
export const EVENT_TYPES:   ReadonlySet<string> = new Set(["IN_PERSON", "ONLINE", "HYBRID"]);
export const PRICE_OPTIONS: ReadonlySet<string> = new Set(["free", "paid"]);
export const WHEN_OPTIONS:  ReadonlySet<string> = new Set([
  "today", "tomorrow", "weekend", "this-week", "next-week", "this-month"
]);

export const SORT_OPTIONS = {
  soon:    { startsAt:  "asc"  as const },
  latest:  { createdAt: "desc" as const },
  popular: { viewCount: "desc" as const }
};
export type SortKey   = keyof typeof SORT_OPTIONS;
export type WhenKey   = "" | "today" | "tomorrow" | "weekend" | "this-week" | "next-week" | "this-month";
export type EventType = "IN_PERSON" | "ONLINE" | "HYBRID";
export type PriceKey  = "" | "free" | "paid";

export const WHEN_LABEL: Record<Exclude<WhenKey, "">, string> = {
  "today":      "Today",
  "tomorrow":   "Tomorrow",
  "weekend":    "This weekend",
  "this-week":  "This week",
  "next-week":  "Next week",
  "this-month": "This month"
};

/* ────────── Date-window computation for the `when` preset ────────── */
export function whenRange(when: WhenKey): [Date, Date] | null {
  if (!when) return null;
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const addDays = (d: Date, n: number) => {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
  };
  const startOfWeek = (d: Date) => {
    const r = new Date(d);
    const day = r.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    r.setHours(0, 0, 0, 0); r.setDate(r.getDate() + diff);
    return r;
  };
  switch (when) {
    case "today":      return [start, addDays(start, 1)];
    case "tomorrow":   return [addDays(start, 1), addDays(start, 2)];
    case "weekend": {
      const dow = start.getDay();
      const toSat = (6 - dow + 7) % 7;
      const sat = addDays(start, toSat);
      return [sat, addDays(sat, 2)];
    }
    case "this-week":  return [start, addDays(startOfWeek(start), 7)];
    case "next-week": {
      const nextMon = addDays(startOfWeek(start), 7);
      return [nextMon, addDays(nextMon, 7)];
    }
    case "this-month": {
      const first = new Date(start.getFullYear(), start.getMonth(), 1);
      const next  = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return [first, next];
    }
    default: return null;
  }
}

export type RawSearchParams = {
  q?: string; city?: string; category?: string; type?: string;
  price?: string; sort?: string; when?: string;
};

/**
 * Filters carry both array shapes (used by multi-select UIs like the map
 * view sidebar) and single-string convenience accessors that pick the
 * first element (used by the dropdown-style controls on /browse). URLs
 * remain CSV: `?category=CULTURAL,MUSIC&city=Lagos,Nairobi`.
 */
export type BrowseFilters = {
  q:          string;
  cities:     string[];
  categories: string[];
  types:      EventType[];
  prices:     Exclude<PriceKey, "">[];
  sort:       SortKey;
  when:       WhenKey;
  /* Convenience first-of accessors — empty string when the array is
     empty. Lets older single-select call-sites keep working unchanged. */
  city:       string;
  category:   string;
  type:       "" | EventType;
  price:      PriceKey;
};

/* CSV → trimmed, deduped, allow-listed array. Cap at `max` so a malicious
   URL can't blow the query plan with a hundred OR clauses. */
function parseList(raw: string | undefined, allow?: ReadonlySet<string>, max = 12): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const v = part.trim();
    if (!v) continue;
    if (allow && !allow.has(v)) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Normalize and validate querystring filters. Every field passes through
 * an allow-list so tampered URLs can't reach Prisma with arbitrary
 * values; unknown strings collapse to the safe default ([] / "soon").
 */
export function parseFilters(sp: RawSearchParams): BrowseFilters {
  const cities     = parseList(sp.city)
                       .map((c) => c.slice(0, 80));
  const categories = parseList(sp.category, CATEGORY_KEYS);
  const types      = parseList(sp.type,     EVENT_TYPES)   as EventType[];
  const prices     = parseList(sp.price,    PRICE_OPTIONS) as Exclude<PriceKey, "">[];

  return {
    q:          (sp.q ?? "").trim().slice(0, 120),
    cities,
    categories,
    types,
    prices,
    sort:       sp.sort && sp.sort in SORT_OPTIONS ? (sp.sort as SortKey) : "soon",
    when:       WHEN_OPTIONS.has(sp.when ?? "") ? (sp.when as WhenKey) : "",
    /* First-of shims for legacy single-select callers. */
    city:       cities[0]     ?? "",
    category:   categories[0] ?? "",
    type:       types[0]      ?? "",
    price:      prices[0]     ?? ""
  };
}

/**
 * Build a Prisma `EventWhereInput` from parsed filters. Always scopes
 * to PUBLISHED events whose `endsAt ≥ now` so past events don't leak
 * into browse results.
 *
 * Multi-select semantics:
 *   • categories / types — `OR` (`field IN [...]`)
 *   • cities — `OR`. The pseudo-city "Online" maps to `type: ONLINE` so
 *     "in person London + Online" returns both
 *   • prices — `free` matches events with any free tier, `paid` matches
 *     any paid tier, both selected = no price restriction
 */
export function buildEventWhere(f: BrowseFilters): Prisma.EventWhereInput {
  const range = whenRange(f.when);
  const onlineSelected = f.cities.some((c) => c.toLowerCase() === "online");
  const realCities     = f.cities.filter((c) => c.toLowerCase() !== "online");

  /* City filter — combine real city OR clauses with an Online-type OR
     clause so "Lagos + Online" returns events in Lagos AND every online
     event. Built up here and only spliced into `where` when non-empty. */
  const cityClauses: Prisma.EventWhereInput[] = [];
  for (const name of realCities) {
    cityClauses.push({ city: { equals: name, mode: "insensitive" } });
  }
  if (onlineSelected) cityClauses.push({ type: "ONLINE" });

  /* Price filter — `OR` of per-price-tag predicates. Both selected
     short-circuits to no filter (every tier counts). */
  const wantsFree = f.prices.includes("free");
  const wantsPaid = f.prices.includes("paid");
  const priceClause: Prisma.EventWhereInput["ticketTiers"] | undefined =
    wantsFree && !wantsPaid ? { some: { priceCents: 0 } } :
    wantsPaid && !wantsFree ? { some: { priceCents: { gt: 0 } } } :
    undefined;

  return {
    status: "PUBLISHED",
    endsAt: { gte: new Date() },
    ...(f.categories.length > 0
          ? { category: { in: f.categories as EventCategory[] } }
          : {}),
    ...(f.types.length > 0
          ? { type: { in: f.types } }
          : {}),
    ...(cityClauses.length > 0
          ? (cityClauses.length === 1 ? cityClauses[0] : { OR: cityClauses })
          : {}),
    ...(f.q ? {
      AND: [{
        OR: [
          { title:       { contains: f.q, mode: "insensitive" } },
          { summary:     { contains: f.q, mode: "insensitive" } },
          { description: { contains: f.q, mode: "insensitive" } }
        ]
      }]
    } : {}),
    ...(range ? { startsAt: { gte: range[0], lt: range[1] } } : {}),
    ...(priceClause ? { ticketTiers: priceClause } : {})
  };
}
