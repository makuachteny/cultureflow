"use client";

import { useSearchParams } from "next/navigation";

/**
 * Client-side inputs for the header's search pill — pre-fills from the
 * current URL so after submitting, the pill reflects what the user
 * typed rather than reverting to empty boxes on every result page.
 *
 * Export both the query input and the city input separately so the
 * server Header can drop each into its own `<label>` with the icon
 * and layout chrome kept server-rendered.
 */

/* Shared input style — `appearance-none`, `border-0`, `ring-0`, `outline-none`
 *  on focus together kill every browser default that would otherwise paint
 *  an inner rounded shape inside the search pill (Chrome's blue inner glow,
 *  Safari's inset shadow, Firefox's dotted outline). The pill stays one
 *  clean rounded shape under interaction. */
const SEARCH_INPUT_CLASS =
  "w-full bg-transparent appearance-none border-0 outline-none ring-0 " +
  "shadow-none text-[15px] text-ink-900 placeholder:text-ink-600 " +
  "focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none";

export function HeaderQueryInput() {
  const sp = useSearchParams();
  return (
    <input
      name="q"
      defaultValue={sp?.get("q") ?? ""}
      className={SEARCH_INPUT_CLASS}
      placeholder="Search events"
      aria-label="Search events"
    />
  );
}

export function HeaderCityInput() {
  const sp = useSearchParams();
  return (
    <input
      name="city"
      defaultValue={sp?.get("city") ?? ""}
      className={SEARCH_INPUT_CLASS}
      placeholder="Anywhere"
      aria-label="Location"
    />
  );
}
