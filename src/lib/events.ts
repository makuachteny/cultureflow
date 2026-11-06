/**
 * Event-display helpers — shared by EventCard, EventRow, TicketPanel,
 * event detail page, and anywhere else that renders an event summary.
 *
 * Before this module, each of those files had its own copy of the same
 * formatting logic, which drifted (EventCard returned `string | null`
 * for availability, EventRow returned `{ label, tone }`, etc.). All
 * consumers now pull from this single source.
 */

import { formatPrice } from "@/lib/utils";

// ───────────────────────── date helpers ─────────────────────────

function dayStart(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/**
 * Canonical single-line event date string:
 *   • "Today · 9:00 AM"
 *   • "Tomorrow · 7:30 PM"
 *   • "Saturday · 10:00 AM"     (within the next 6 days)
 *   • "Sat, Apr 28 · 8:00 AM"   (beyond that, or in the past)
 *
 * Used by every event listing (cards, rows, tickets, detail pages).
 * Localizes to en-US deliberately — we default to USD/US locale across
 * the platform; localization of dates is a separate future concern.
 */
/**
 * Stacked date-badge parts for the EventCard "calendar tear" overlay.
 * Returns the three pieces that compose the badge:
 *   • month  — short uppercase ("APR")
 *   • day    — day of month as a string ("28")
 *   • weekday — short weekday ("Sat") for the eyebrow meta
 *   • time   — formatted clock time ("7:00 PM")
 */
export function eventDateParts(d: Date | string): {
  month: string; day: string; weekday: string; time: string;
} {
  const date = typeof d === "string" ? new Date(d) : d;
  return {
    month:   date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day:     String(date.getDate()),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    time:    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  };
}

export function formatEventDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const daysAhead = Math.round(
    (dayStart(date).getTime() - dayStart(new Date()).getTime()) / 86_400_000
  );

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  let dateStr: string;
  if (daysAhead === 0) dateStr = "Today";
  else if (daysAhead === 1) dateStr = "Tomorrow";
  else if (daysAhead >= 2 && daysAhead <= 6) {
    dateStr = date.toLocaleDateString("en-US", { weekday: "long" });
  } else {
    dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }

  return `${dateStr} · ${time}`;
}

// ─────────────────────── availability status ───────────────────────

/**
 * Visual tone family for status badges. Cards translate these into
 * concrete classes (e.g. `bg-[#FCE7E5] text-hibiscus` for "hot").
 *
 *   hot       — urgent / definitive (sold out, almost full, last chance)
 *   warn      — soft urgency (sales end soon, going fast, starts today)
 *   info      — informational / time signposts (this weekend, just listed)
 *   editorial — featured / curated (gold)
 *   stop      — cancelled / closed (muted neutral red)
 */
export type AvailabilityTone = "hot" | "warn" | "info" | "editorial" | "stop";

export type AvailabilityStatus = {
  label: string;
  tone: AvailabilityTone;
};

type Tier = { quantity: number; sold: number };

/**
 * Capacity-only urgency, used internally and as the legacy public name
 * still referenced by older call sites. Considers only sold/total ratio.
 *
 * Thresholds:
 *   ≥ 1.0 → "Sold out"      (hot — definitive)
 *   ≥ 0.9 → "Almost full"   (hot)
 *   ≥ 0.7 → "Sales end soon"(warn)
 *   ≥ 0.5 → "Going fast"    (warn)
 *   else  → null (silence beats shouting "plenty left")
 */
export function availabilityStatus(tiers: Tier[]): AvailabilityStatus | null {
  const totalQty = tiers.reduce((s, t) => s + (t.quantity ?? 0), 0);
  const totalSold = tiers.reduce((s, t) => s + (t.sold ?? 0), 0);
  if (totalQty <= 0) return null;
  const pct = totalSold / totalQty;
  if (pct >= 1.0) return { label: "Sold out",       tone: "hot"  };
  if (pct >= 0.9) return { label: "Almost full",    tone: "hot"  };
  if (pct >= 0.7) return { label: "Sales end soon", tone: "warn" };
  if (pct >= 0.5) return { label: "Going fast",     tone: "warn" };
  return null;
}

/* ─────────── Richer event-status helper ───────────
 *
 * `eventBadge()` chooses the single most relevant badge for a card, given
 * the full set of signals: lifecycle state (cancelled/draft), capacity
 * (sold-out → going-fast), and timing (starts today, this weekend, last
 * chance, just listed). Priority is fixed — definitive states first,
 * then urgent-capacity, then urgent-time, then soft signals — so two
 * cards in a grid never bury an important "Sold out" under a softer
 * "This weekend".
 */

export type EventBadgeInput = {
  /** Lifecycle status — DRAFT/PUBLISHED/PAST/CANCELLED. */
  status?: string | null;
  /** Whether the event is editorially featured. */
  featured?: boolean | null;
  /** ONLINE / IN_PERSON / HYBRID. */
  type?: string | null;
  /** When the event begins. */
  startsAt: Date | string;
  /** When the event ends — used to flag "ending soon" mid-event. */
  endsAt?: Date | string | null;
  /** When the event was first listed — drives "Just listed". */
  createdAt?: Date | string | null;
  /** Ticket tiers — drives capacity badges. */
  ticketTiers: Tier[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS  = 24 * HOUR_MS;

function asDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  return typeof d === "string" ? new Date(d) : d;
}

/**
 * Pick the single most relevant status badge. Returns `null` when no
 * signal is strong enough to deserve real-estate on the card (avoids
 * "Registration open" noise on every quiet event).
 *
 * Priority (top wins):
 *   1. Cancelled            (stop)
 *   2. Sold out             (hot)
 *   3. Last chance          (hot — < 24h to start, still selling)
 *   4. Almost full          (hot — ≥ 90% capacity)
 *   5. Starts today/tonight (warn — same calendar day)
 *   6. Sales end soon       (warn — ≥ 70% capacity OR < 3 days to start)
 *   7. Starts tomorrow      (warn)
 *   8. Going fast           (warn — ≥ 50% capacity)
 *   9. This weekend         (info — Sat/Sun within 7 days)
 *  10. Just listed          (info — < 3 days since createdAt)
 *  11. Online event         (info — type === ONLINE, no other signal)
 *
 *  ("Featured" is deliberately not a per-card badge — the editorial
 *  "Featured this week" rail at section level already surfaces those
 *  events, so a card chip would just repeat the section header.)
 */
export function eventBadge(e: EventBadgeInput): AvailabilityStatus | null {
  const now      = new Date();
  const startsAt = asDate(e.startsAt);
  if (!startsAt) return null;

  const endsAt   = asDate(e.endsAt);
  const created  = asDate(e.createdAt);
  const status   = (e.status ?? "").toUpperCase();
  const type     = (e.type ?? "").toUpperCase();

  // 1. Cancelled (lifecycle, definitive).
  if (status === "CANCELLED") return { label: "Cancelled", tone: "stop" };

  // Capacity — sold out trumps all but cancelled.
  const cap = availabilityStatus(e.ticketTiers);
  if (cap?.label === "Sold out") return cap;

  const msToStart = startsAt.getTime() - now.getTime();
  const msToEnd   = endsAt ? endsAt.getTime() - now.getTime() : null;
  const sameDay   = isSameLocalDay(startsAt, now);
  const isPast    = msToStart < 0 && (msToEnd === null || msToEnd < 0);

  if (status === "PAST" || isPast) return null; // past events: no urgency

  // Mid-event ("Happening now") — only for events with an end, currently inside the window.
  if (msToStart <= 0 && msToEnd !== null && msToEnd > 0) {
    return { label: "Happening now", tone: "hot" };
  }

  // 3. Last chance — < 24h to start, still room left.
  if (msToStart > 0 && msToStart <= DAY_MS && cap === null) {
    return { label: "Last chance", tone: "hot" };
  }

  // 4. Almost full — capacity ≥ 90% (other capacity badges return below).
  if (cap?.label === "Almost full") return cap;

  // 5. Starts today / tonight.
  if (sameDay && msToStart > 0) {
    const hour = startsAt.getHours();
    return {
      label: hour >= 17 ? "Starts tonight" : "Starts today",
      tone:  "warn"
    };
  }

  // 6. Sales end soon — capacity ≥ 70% OR ≤ 3 days to start (whichever fires).
  if (cap?.label === "Sales end soon") return cap;
  if (msToStart > 0 && msToStart <= 3 * DAY_MS) {
    return { label: "Sales end soon", tone: "warn" };
  }

  // 7. Starts tomorrow.
  if (msToStart > 0 && msToStart <= 2 * DAY_MS && isSameLocalDay(startsAt, addDays(now, 1))) {
    return { label: "Starts tomorrow", tone: "warn" };
  }

  // 8. Going fast — capacity ≥ 50%.
  if (cap?.label === "Going fast") return cap;

  // 9. This weekend — within the next 7 days AND falls on Sat/Sun.
  const wd = startsAt.getDay(); // 0 Sun … 6 Sat
  if (msToStart > 0 && msToStart <= 7 * DAY_MS && (wd === 0 || wd === 6)) {
    return { label: "This weekend", tone: "info" };
  }

  // 10. Just listed — created within the last 3 days.
  if (created) {
    const ageMs = now.getTime() - created.getTime();
    if (ageMs >= 0 && ageMs <= 3 * DAY_MS) {
      return { label: "Just listed", tone: "info" };
    }
  }

  // 11. Online event — only when no other signal fired.
  if (type === "ONLINE")    return { label: "Online event", tone: "info" };

  // (Featured intentionally omitted from card badges — the editorial
  // "Featured this week" rail at section level already surfaces those
  // events; a per-card chip would just repeat the section header.)

  return null;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + days);
  return r;
}

/**
 * Translate an AvailabilityTone to soft pill classes (background tint
 * + matching text colour). Centralised so EventCard, EventRow, and any
 * future surface render the same palette.
 */
export function badgeClasses(tone: AvailabilityTone): string {
  switch (tone) {
    case "hot":       return "bg-[#FCE7E5] text-hibiscus";
    case "warn":      return "bg-[#FFF1CC] text-gold-700";
    case "info":      return "bg-[#E6EFFB] text-nile-700";
    case "editorial": return "bg-gold-50 text-gold-700";
    case "stop":      return "bg-[#EAE9EB] text-ink-600";
    default:          return "bg-cream-100 text-ink-700";
  }
}

// ─────────────────────── price helpers ───────────────────────

type PriceTier = { priceCents: number; currency: string };

/** Lowest priceCents across the tier set; null when the event has no tiers. */
export function minPriceCents(tiers: PriceTier[]): number | null {
  return tiers.reduce<number | null>(
    (m, t) => (m === null ? t.priceCents : Math.min(m, t.priceCents)),
    null
  );
}

/**
 * Consumer-facing price copy:
 *   • no tiers   → "Coming soon"
 *   • min === 0  → "Free"
 *   • otherwise  → "From $X.YY"
 */
export function priceLabel(tiers: PriceTier[]): string {
  if (tiers.length === 0) return "Coming soon";
  const min = minPriceCents(tiers);
  if (min === null || min === 0) return "Free";
  const currency = tiers[0]?.currency ?? "USD";
  return `From ${formatPrice(min, currency)}`;
}

/** `true` when the event has at least one $0 tier OR no tiers at all (i.e. label will say "Free" or "Coming soon"). */
export function isFreeEvent(tiers: PriceTier[]): boolean {
  if (tiers.length === 0) return false;
  const min = minPriceCents(tiers);
  return min === 0 || min === null;
}

// ─────────────────────── category accents ───────────────────────

/**
 * Per-category accent color. Each category gets one strong, brand-safe
 * hue that shows up as a small dot/label on cards, chips, and rails so
 * the grid reads with variety instead of as a wall of nile-blue.
 *
 * `hoverBg` and `hoverText` are written out long-hand (rather than
 * concatenated at runtime) so Tailwind's content scanner picks them up
 * during purge. Don't switch them back to `"group-hover:" + bg`.
 *
 * Returns:
 *   • bg        — solid token to use as a background on a chip
 *   • dot       — solid token for a 6px dot
 *   • text      — AA-safe label color when paired with `bg`
 *   • hoverBg   — group-hover:bg-* literal (for tinted hover discs)
 *   • hoverText — group-hover:text-* literal (for icon hover color)
 */
type CategoryAccent = {
  bg: string; dot: string; text: string;
  hoverBg: string; hoverText: string;
};
const CATEGORY_ACCENTS: Record<string, CategoryAccent> = {
  cultural:   { bg: "bg-gold-50",     dot: "bg-gold",     text: "text-gold-700",   hoverBg: "group-hover:bg-gold-50",     hoverText: "group-hover:text-gold-700"   },
  music:      { bg: "bg-hibiscus/10", dot: "bg-hibiscus", text: "text-hibiscus",   hoverBg: "group-hover:bg-hibiscus/10", hoverText: "group-hover:text-hibiscus"   },
  sports:     { bg: "bg-clay/10",     dot: "bg-clay",     text: "text-clay",       hoverBg: "group-hover:bg-clay/10",     hoverText: "group-hover:text-clay"       },
  education:  { bg: "bg-nile-50",     dot: "bg-nile",     text: "text-nile-700",   hoverBg: "group-hover:bg-nile-50",     hoverText: "group-hover:text-nile-700"   },
  faith:      { bg: "bg-cream-200",   dot: "bg-clay",     text: "text-clay",       hoverBg: "group-hover:bg-cream-200",   hoverText: "group-hover:text-clay"       },
  networking: { bg: "bg-acacia-50",   dot: "bg-acacia",   text: "text-acacia-600", hoverBg: "group-hover:bg-acacia-50",   hoverText: "group-hover:text-acacia-600" },
  wedding:    { bg: "bg-hibiscus/10", dot: "bg-hibiscus", text: "text-hibiscus",   hoverBg: "group-hover:bg-hibiscus/10", hoverText: "group-hover:text-hibiscus"   },
  community:  { bg: "bg-acacia-50",   dot: "bg-acacia",   text: "text-acacia-600", hoverBg: "group-hover:bg-acacia-50",   hoverText: "group-hover:text-acacia-600" },
  business:   { bg: "bg-nile-50",     dot: "bg-nile",     text: "text-nile-700",   hoverBg: "group-hover:bg-nile-50",     hoverText: "group-hover:text-nile-700"   },
  fundraiser: { bg: "bg-gold-50",     dot: "bg-gold",     text: "text-gold-700",   hoverBg: "group-hover:bg-gold-50",     hoverText: "group-hover:text-gold-700"   },
  family:     { bg: "bg-hibiscus/10", dot: "bg-hibiscus", text: "text-hibiscus",   hoverBg: "group-hover:bg-hibiscus/10", hoverText: "group-hover:text-hibiscus"   },
  other:      { bg: "bg-cream-200",   dot: "bg-ink-500",  text: "text-ink-700",    hoverBg: "group-hover:bg-cream-200",   hoverText: "group-hover:text-ink-700"    }
};
const DEFAULT_ACCENT: CategoryAccent = {
  bg: "bg-cream-200", dot: "bg-ink-500", text: "text-ink-700",
  hoverBg: "group-hover:bg-cream-200", hoverText: "group-hover:text-ink-700"
};

/** Lowercase the prisma EventCategory enum value before lookup so callers
 *  don't have to know whether the source is "MUSIC" or "music". */
export function categoryAccent(category: string | null | undefined): CategoryAccent {
  if (!category) return DEFAULT_ACCENT;
  return CATEGORY_ACCENTS[category.toLowerCase()] ?? DEFAULT_ACCENT;
}

/** Display label for a category enum/slug: "MUSIC" → "Music". */
export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "";
  const s = category.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────── venue helpers ───────────────────────

type VenueFields = {
  type?: "IN_PERSON" | "ONLINE" | "HYBRID" | null;
  venueName?: string | null;
  city?: string | null;
  country?: string | null;
};

/**
 * Canonical venue string for an event summary. Order of precedence:
 *   1. "Online event" when type === ONLINE
 *   2. venueName when present
 *   3. "City, Country"
 *   4. fallback (configurable)
 */
export function venueString(e: VenueFields, fallback = "Venue TBA"): string {
  if (e.type === "ONLINE") return "Online event";
  if (e.venueName) return e.venueName;
  if (e.city) return e.country ? `${e.city}, ${e.country}` : e.city;
  return fallback;
}
