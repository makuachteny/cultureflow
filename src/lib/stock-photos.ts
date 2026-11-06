/**
 * Stock photography for marketing pages, browse themes, event templates,
 * and seed data.
 *
 * GOAL: every photo on this list should depict South Sudanese (or
 * broader diaspora / African community) gatherings — weddings, cultural
 * nights, church services, sports, family reunions, business mixers.
 *
 * EVERY image is now LOCAL — they live under /public/community/ and ship
 * with the deploy. No CDN dependency, no licensing surprises, no broken
 * upstream IDs. The originals were sourced from Unsplash and downloaded
 * by `scripts/download-community-photos.mjs` (see `MANIFEST.json` in the
 * community folder for the photo IDs).
 *
 * HOW TO REPLACE:
 *   1. Drop your own JPG into `/public/community/` with the same
 *      filename (e.g. wedding-celebration.jpg).
 *   2. That's it — every page that references the slot picks it up.
 *      No code changes needed.
 *   3. Re-run `node scripts/download-community-photos.mjs` only if you
 *      want to refresh the Unsplash defaults.
 */

/** Image used when nothing else fits — already shipped in /public. */
const SAVANNA_SUNSET = "/savanna-sunset.jpg";

/** Build a `/community/<name>.jpg` path. Keeps callsites tidy. */
const LOCAL = (name: string) => `/community/${name}.jpg`;

/* ─── Curated photos by theme ───
 *  Multiple slots per theme so the page-level layouts can vary. */
export const PHOTOS = {
  cultural: [
    LOCAL("cultural-dancers-flags"),
    LOCAL("cultural-performance"),
    LOCAL("cultural-celebration")
  ],
  music: [
    LOCAL("music-concert-crowd"),
    LOCAL("music-live-stage")
  ],
  sports: [
    LOCAL("sports-football"),
    LOCAL("sports-pitch"),
    LOCAL("sports-tournament")
  ],
  faith: [
    LOCAL("faith-sanctuary"),
    LOCAL("faith-congregation")
  ],
  wedding: [
    LOCAL("wedding-celebration")
  ],
  community: [
    LOCAL("community-outdoors"),
    LOCAL("networking-hands")
  ],
  business: [
    LOCAL("business-speaker"),
    LOCAL("business-mixer")
  ],
  family: [
    LOCAL("family-together")
  ],
  education: [
    LOCAL("education-books")
  ],
  fundraiser: [
    LOCAL("cultural-performance")
  ],
  // Use cases where any "diaspora life" image fits — generic warm fallback.
  diasporaHero: [
    SAVANNA_SUNSET,
    LOCAL("diaspora-hero-1"),
    LOCAL("diaspora-hero-2")
  ]
} as const;

/** First image for a theme, with a deterministic fallback to the warm
 *  savanna-sunset shipped in /public. Used by code that wants a single
 *  image without picking from an array. */
export function pickPhoto(theme: keyof typeof PHOTOS): string {
  const list = PHOTOS[theme];
  return list?.[0] ?? SAVANNA_SUNSET;
}

/** Default banner shown on event placeholders (no organizer-uploaded
 *  banner yet). Always something locally-hosted so the listing never
 *  hits a stale CDN. */
export const PLACEHOLDER_BANNER = SAVANNA_SUNSET;
