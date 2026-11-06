// Cities and categories surfaced in the marketing / SEO layer. Keep lowercase
// slug as the URL form; render label as-is.

/**
 * Featured cities — the major South Sudanese hubs at home and across the
 * diaspora. Cities are ordered by rough audience proximity for the default
 * unauthenticated visitor; `src/lib/geo.ts` overrides this per-request when
 * geo signals are available. Organizers can publish events in any city —
 * this list is just the home/footer/sitemap seed, not a whitelist.
 */
export const FEATURED_CITIES = [
  { slug: "juba",         label: "Juba",         country: "South Sudan" },
  { slug: "wau",          label: "Wau",          country: "South Sudan" },
  { slug: "khartoum",     label: "Khartoum",     country: "Sudan" },
  { slug: "nairobi",      label: "Nairobi",      country: "Kenya" },
  { slug: "kampala",      label: "Kampala",      country: "Uganda" },
  { slug: "cairo",        label: "Cairo",        country: "Egypt" },
  { slug: "london",       label: "London",       country: "UK" },
  { slug: "toronto",      label: "Toronto",      country: "Canada" },
  { slug: "calgary",      label: "Calgary",      country: "Canada" },
  { slug: "melbourne",    label: "Melbourne",    country: "Australia" },
  { slug: "sydney",       label: "Sydney",       country: "Australia" },
  { slug: "omaha",        label: "Omaha",        country: "USA" }
] as const;

export type CitySlug = (typeof FEATURED_CITIES)[number]["slug"];

/**
 * Category thumbnails are LOCAL files under /public/community/ —
 * downloaded via `scripts/download-community-photos.mjs`. Replace any
 * single image by dropping a same-named JPG into /public/community/.
 * The same files power `src/lib/stock-photos.ts` so swapping a photo
 * here updates marketing pages and event placeholders too.
 */
const LOCAL = (name: string) => `/community/${name}.jpg`;

export const CATEGORIES = [
  { slug: "cultural",   key: "CULTURAL",   label: "Cultural",    blurb: "Independence Day, cultural nights, traditional dance, heritage celebrations.",
    image: LOCAL("cultural-dancers-flags") },
  { slug: "music",      key: "MUSIC",      label: "Music",       blurb: "Concerts, DJ sets, live bands, and South Sudanese music showcases.",
    image: LOCAL("music-concert-crowd") },
  { slug: "sports",     key: "SPORTS",     label: "Sports",      blurb: "Tournaments, youth leagues, basketball games and Cranes/Bright Stars watch parties.",
    image: LOCAL("sports-tournament") },
  { slug: "education",  key: "EDUCATION",  label: "Education",   blurb: "Workshops, seminars, panel discussions, and learning events.",
    image: LOCAL("education-books") },
  { slug: "faith",      key: "FAITH",      label: "Faith",       blurb: "Services, conventions, revivals, and faith-based gatherings.",
    image: LOCAL("faith-sanctuary") },
  { slug: "networking", key: "NETWORKING", label: "Networking",  blurb: "Professional mixers, alumni nights, community meetups.",
    image: LOCAL("networking-hands") },
  { slug: "wedding",    key: "WEDDING",    label: "Weddings",    blurb: "Traditional ceremonies, dowry events, receptions, engagement parties.",
    image: LOCAL("wedding-celebration") },
  { slug: "community",  key: "COMMUNITY",  label: "Community",   blurb: "Town halls, forums, neighborhood gatherings, chapter meetings.",
    image: LOCAL("community-outdoors") },
  { slug: "business",   key: "BUSINESS",   label: "Business",    blurb: "Launches, conferences, trade fairs, industry mixers.",
    image: LOCAL("business-speaker") },
  { slug: "fundraiser", key: "FUNDRAISER", label: "Fundraisers", blurb: "Scholarship drives, send-back-home appeals, charity galas.",
    image: LOCAL("cultural-performance") },
  { slug: "family",     key: "FAMILY",     label: "Family",      blurb: "Kids' programs, family reunions, multi-generational events.",
    image: LOCAL("family-together") },
  { slug: "other",      key: "OTHER",      label: "Other",       blurb: "Everything else that brings South Sudanese together.",
    image: LOCAL("cultural-confetti") }
] as const;

/**
 * Suggested tribe labels shown under the free-text tribe input as
 * quick-add chips. Covers the largest South Sudanese ethnic groups so
 * organizers can tag their event in one tap. The list is a seed, not a
 * whitelist; `User.tribe` and `Event.visibleTribes` accept any string,
 * so smaller communities and sub-clans aren't shut out.
 */
export const TRIBE_SUGGESTIONS = [
  "Dinka",
  "Nuer",
  "Bari",
  "Shilluk",
  "Azande",
  "Mundari",
  "Acholi",
  "Toposa",
  "Anuak",
  "Murle",
  "Kakwa",
  "Lotuko"
] as const;

/**
 * Who can see the event. Matches the Prisma TribeVisibility enum.
 */
export const TRIBE_VISIBILITY_OPTIONS = [
  { value: "ALL_SOUTH_SUDANESE", label: "All South Sudanese", help: "Open to anyone from the South Sudanese community. Best for public gatherings." },
  { value: "SELECTED_TRIBES",    label: "Selected tribes",    help: "Pick which tribes this event is for." },
  { value: "OWN_TRIBE",          label: "My tribe only",      help: "Only visible to members of your own tribe." }
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type CategoryKey  = (typeof CATEGORIES)[number]["key"];

export function categoryFromSlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
export function cityFromSlug(slug: string) {
  return FEATURED_CITIES.find((c) => c.slug === slug);
}
