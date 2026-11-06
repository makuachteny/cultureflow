/**
 * Tiny utility helpers. All date formatting now runs on native
 * `Intl.DateTimeFormat` / `toLocaleString()` so the project can drop
 * `date-fns` entirely — one less dep in the bundle.
 */

/** Join truthy class-name parts. Covered by tests; kept exported
 *  because it'll show up in future JSX as styling grows. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function formatPrice(cents: number, currency = "USD") {
  if (cents <= 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** "Sat, Apr 28, 2026 • 8:00 AM" — full, human-legible date+time. */
export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const day = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit"
  });
  return `${day} • ${time}`;
}

/** "5 minutes ago" / "in 2 hours" / "3 days ago" — native Intl.RelativeTimeFormat. */
export function formatRelative(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = date.getTime() - Date.now();
  const absMs  = Math.abs(diffMs);
  const sign   = diffMs < 0 ? -1 : 1;
  const rtf    = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year",   365 * 24 * 60 * 60 * 1000],
    ["month",   30 * 24 * 60 * 60 * 1000],
    ["week",     7 * 24 * 60 * 60 * 1000],
    ["day",          24 * 60 * 60 * 1000],
    ["hour",              60 * 60 * 1000],
    ["minute",                 60 * 1000],
    ["second",                      1000]
  ];
  for (const [unit, ms] of units) {
    if (absMs >= ms || unit === "second") {
      return rtf.format(sign * Math.round(absMs / ms), unit);
    }
  }
  return "just now";
}
