import Link from "next/link";
import { CATEGORIES, FEATURED_CITIES } from "@/lib/taxonomy";

/**
 * FilterSidebar — left rail on the map view. Multi-selectable groups
 * with checkbox-style rows. The "applied chips" strip lived above the
 * groups in an earlier revision; it duplicated state already shown by
 * the in-list checkmarks, so it's gone — the row indicators are the
 * single source of truth for what's applied. A "Clear all" link sits
 * inside each group when at least one of its items is on, scoped to
 * that facet, plus a global Reset at the top of the rail when ANY
 * filter is on.
 *
 * Each item is a plain `<Link>` that toggles its own value into the
 * comma-separated querystring slot — no client JS required.
 */

type MakeHref = (patch: Record<string, string>) => string;

type Props = {
  active: {
    q:          string;
    cities:     string[];
    categories: string[];
    types:      string[];
    prices:     string[];
    when:       string;
  };
  makeHref: MakeHref;
  /** Distinct `Event.city` values currently in the result set. Lets us
   *  surface a list that reflects live inventory instead of a static
   *  city list. Cap at 8 for the collapsed state. */
  availableCities: string[];
};

const WHEN_OPTIONS = [
  { key: "today",      label: "Today" },
  { key: "tomorrow",   label: "Tomorrow" },
  { key: "weekend",    label: "This weekend" },
  { key: "this-week",  label: "This week" },
  { key: "next-week",  label: "Next week" },
  { key: "this-month", label: "This month" }
] as const;

const TYPE_OPTIONS = [
  { key: "IN_PERSON", label: "In person" },
  { key: "ONLINE",    label: "Online" },
  { key: "HYBRID",    label: "Hybrid" }
] as const;

const PRICE_OPTIONS = [
  { key: "free", label: "Free" },
  { key: "paid", label: "Paid" }
] as const;

/** Toggle a value in/out of a string list, return as CSV. Empty list ⇒ "" so the param drops out of the URL entirely. */
function toggleCsv(list: string[], value: string): string {
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return next.join(",");
}

export default function FilterSidebar({ active, makeHref, availableCities }: Props) {
  const anyOn =
    active.cities.length     > 0 ||
    active.categories.length > 0 ||
    active.types.length      > 0 ||
    active.prices.length     > 0 ||
    Boolean(active.when)     ||
    Boolean(active.q);

  return (
    <aside
      aria-label="Filters"
      className="w-full lg:w-[240px] shrink-0 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1"
    >
      {/* Section heading shows only on lg+ — the mobile drawer renders
          its own "Filters" header so a duplicate would read weird. */}
      <div className="hidden lg:flex items-baseline justify-between gap-3">
        <h2 className="text-[22px] font-display font-bold text-ink-900">Filters</h2>
        {anyOn && (
          <Link
            href="/browse/map"
            className="text-[12.5px] font-semibold text-nile hover:underline"
          >
            Reset
          </Link>
        )}
      </div>

      {/* Mobile reset — same affordance, but stretched into a quiet pill
          so it sits naturally inside the drawer without competing with
          the section heading the drawer chrome already renders. */}
      {anyOn && (
        <div className="lg:hidden mb-1">
          <Link
            href="/browse/map"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cream-200 text-[12.5px] font-semibold text-ink-800 hover:bg-cream-100 motion-safe:transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 109-9" />
              <path d="M3 5v4h4" />
            </svg>
            Reset all filters
          </Link>
        </div>
      )}

      <Group
        label="Categories"
        items={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        activeKeys={active.categories}
        collapseAfter={4}
        toHref={(key) => makeHref({ category: toggleCsv(active.categories, key) })}
        clearHref={makeHref({ category: "" })}
      />

      <Group
        label="Date"
        items={WHEN_OPTIONS.map((w) => ({ key: w.key, label: w.label }))}
        /* Date stays single-select — semantically you can't be "today
           and next week" at once. Render as radios. */
        activeKeys={active.when ? [active.when] : []}
        collapseAfter={4}
        variant="radio"
        toHref={(key) => makeHref({ when: key === active.when ? "" : key })}
        clearHref={makeHref({ when: "" })}
      />

      <Group
        label="Format"
        items={TYPE_OPTIONS.map((t) => ({ key: t.key, label: t.label }))}
        activeKeys={active.types}
        toHref={(key) => makeHref({ type: toggleCsv(active.types, key) })}
        clearHref={makeHref({ type: "" })}
      />

      <Group
        label="Price"
        items={PRICE_OPTIONS.map((p) => ({ key: p.key, label: p.label }))}
        activeKeys={active.prices}
        toHref={(key) => makeHref({ price: toggleCsv(active.prices, key) })}
        clearHref={makeHref({ price: "" })}
      />

      {/* City — prefer the live list from results; fall back to FEATURED_CITIES so the rail is never empty on an empty result set. The active selection is preserved in the list even if it's no longer present in availableCities. */}
      <Group
        label="City"
        items={
          (availableCities.length > 0
            ? Array.from(new Set([...active.cities, ...availableCities]))
            : Array.from(new Set([...active.cities, ...FEATURED_CITIES.map((c) => c.label)]))
          ).map((name) => ({ key: name, label: name }))
        }
        activeKeys={active.cities}
        collapseAfter={6}
        toHref={(key) => makeHref({ city: toggleCsv(active.cities, key) })}
        clearHref={makeHref({ city: "" })}
      />
    </aside>
  );
}

/* ─────────────────── internals ─────────────────── */

function Group({
  label, items, activeKeys, toHref, clearHref, collapseAfter, variant = "check"
}: {
  label: string;
  items: Array<{ key: string; label: string }>;
  activeKeys: string[];
  toHref: (key: string) => string;
  clearHref: string;
  collapseAfter?: number;
  variant?: "check" | "radio";
}) {
  /* "Show all"/"View more" is a server-rendered split using the
     querystring instead of client state — keeps the rail SSR-safe. The
     visible-on-collapse slice is plenty for the typical case; clicking
     "View more" jumps to the full browse list. */
  const showCount = collapseAfter ?? items.length;
  /* Always show selected items even if they fall outside the visible
     slice, so a tap doesn't make the row disappear from the rail. */
  const visible = (() => {
    if (items.length <= showCount) return items;
    const head = items.slice(0, showCount);
    const headKeys = new Set(head.map((i) => i.key));
    const extras = items.filter((i) => activeKeys.includes(i.key) && !headKeys.has(i.key));
    return [...head, ...extras];
  })();
  const hasMore = items.length > showCount;
  const isOn = activeKeys.length > 0;

  return (
    <section className="pt-5 pb-4 border-b border-[color:var(--border-hairline)]">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-bold text-ink-900">
          {label}
          {isOn && (
            <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-nile px-1 text-[10.5px] font-bold text-white align-middle">
              {activeKeys.length}
            </span>
          )}
        </h3>
        {isOn && (
          <Link href={clearHref} className="text-[11.5px] font-semibold text-ink-500 hover:text-nile">
            Clear
          </Link>
        )}
      </div>
      <ul className="space-y-1.5">
        {visible.map((it) => {
          const on = activeKeys.some((k) => k.toLowerCase() === it.key.toLowerCase());
          return (
            <li key={it.key}>
              <Link
                href={toHref(it.key)}
                aria-pressed={on}
                className="flex items-center gap-2.5 py-1 text-[14px] text-ink-800 hover:text-ink-900 transition-colors"
              >
                <Indicator on={on} variant={variant} />
                <span className={on ? "font-semibold text-ink-900" : ""}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <Link
          href="/browse"
          className="mt-3 inline-block text-[13px] font-semibold text-nile hover:underline"
        >
          View more
        </Link>
      )}
    </section>
  );
}

function Indicator({ on, variant }: { on: boolean; variant: "check" | "radio" }) {
  if (variant === "radio") {
    return (
      <span
        aria-hidden
        className={
          "relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] " +
          (on ? "border-nile" : "border-[color:var(--border-strong)]")
        }
      >
        {on && <span className="h-2.5 w-2.5 rounded-full bg-nile" />}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={
        "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] " +
        (on ? "border-nile bg-nile text-white" : "border-[color:var(--border-strong)] bg-white")
      }
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}
