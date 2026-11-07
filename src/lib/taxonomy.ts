// Cities and categories surfaced in the marketing / SEO layer. Keep lowercase
// slug as the URL form; render label as-is.

/**
 * Featured cities — a spread of large, multicultural hubs across every
 * continent. Ordered for the default unauthenticated visitor;
 * `src/lib/geo.ts` overrides this per-request when geo signals are
 * available. Organizers can publish events in any city — this list is
 * just the home/footer/sitemap seed, not a whitelist.
 */
export const FEATURED_CITIES = [
  { slug: "new-york",     label: "New York",     country: "USA" },
  { slug: "london",       label: "London",       country: "UK" },
  { slug: "toronto",      label: "Toronto",      country: "Canada" },
  { slug: "lagos",        label: "Lagos",        country: "Nigeria" },
  { slug: "nairobi",      label: "Nairobi",      country: "Kenya" },
  { slug: "mumbai",       label: "Mumbai",       country: "India" },
  { slug: "sao-paulo",    label: "São Paulo",    country: "Brazil" },
  { slug: "mexico-city",  label: "Mexico City",  country: "Mexico" },
  { slug: "paris",        label: "Paris",        country: "France" },
  { slug: "seoul",        label: "Seoul",        country: "South Korea" },
  { slug: "sydney",       label: "Sydney",       country: "Australia" },
  { slug: "juba",         label: "Juba",         country: "South Sudan" }
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
  { slug: "cultural",   key: "CULTURAL",   label: "Cultural",    blurb: "Festivals, heritage days, cultural nights, traditional dance and food.",
    image: LOCAL("cultural-performance") },
  { slug: "music",      key: "MUSIC",      label: "Music",       blurb: "Concerts, DJ sets, live bands, and music from every tradition.",
    image: LOCAL("music-concert-crowd") },
  { slug: "sports",     key: "SPORTS",     label: "Sports",      blurb: "Tournaments, youth leagues, pickup games and national-team watch parties.",
    image: LOCAL("sports-tournament") },
  { slug: "education",  key: "EDUCATION",  label: "Education",   blurb: "Workshops, seminars, panel discussions, and learning events.",
    image: LOCAL("education-books") },
  { slug: "faith",      key: "FAITH",      label: "Faith",       blurb: "Services, conventions, revivals, and faith-based gatherings.",
    image: LOCAL("faith-sanctuary") },
  { slug: "networking", key: "NETWORKING", label: "Networking",  blurb: "Professional mixers, alumni nights, community meetups.",
    image: LOCAL("networking-hands") },
  { slug: "wedding",    key: "WEDDING",    label: "Weddings",    blurb: "Traditional ceremonies, receptions, engagement parties and celebrations.",
    image: LOCAL("wedding-celebration") },
  { slug: "community",  key: "COMMUNITY",  label: "Community",   blurb: "Town halls, forums, neighborhood gatherings, chapter meetings.",
    image: LOCAL("community-outdoors") },
  { slug: "business",   key: "BUSINESS",   label: "Business",    blurb: "Launches, conferences, trade fairs, industry mixers.",
    image: LOCAL("business-speaker") },
  { slug: "fundraiser", key: "FUNDRAISER", label: "Fundraisers", blurb: "Scholarship drives, relief appeals, charity galas.",
    image: LOCAL("cultural-performance") },
  { slug: "family",     key: "FAMILY",     label: "Family",      blurb: "Kids' programs, family reunions, multi-generational events.",
    image: LOCAL("family-together") },
  { slug: "other",      key: "OTHER",      label: "Other",       blurb: "Everything else that brings people together.",
    image: LOCAL("theme-banner-2") }
] as const;

/**
 * Suggested community / heritage labels shown under the free-text input
 * as quick-add chips — a deliberately mixed sample, not a whitelist.
 * `User.tribe` and `Event.visibleTribes` accept any string, so every
 * community, diaspora, clan or congregation can describe itself.
 */
export const TRIBE_SUGGESTIONS = [
  "Yoruba",
  "Punjabi",
  "Mexican",
  "Korean",
  "Irish",
  "Filipino",
  "Somali",
  "Haitian",
  "Dinka",
  "Lebanese",
  "Brazilian",
  "Vietnamese"
] as const;

/**
 * Who can see the event. Matches the Prisma TribeVisibility enum
 * (identifier names predate the universal platform; labels are what users see).
 */
export const TRIBE_VISIBILITY_OPTIONS = [
  { value: "EVERYONE",           label: "Everyone",              help: "Open to anyone. Best for public gatherings." },
  { value: "SELECTED_TRIBES",    label: "Selected communities",  help: "Pick which communities this event is for." },
  { value: "OWN_TRIBE",          label: "My community only",     help: "Only visible to people who share your community." }
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type CategoryKey  = (typeof CATEGORIES)[number]["key"];

export function categoryFromSlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
export function cityFromSlug(slug: string) {
  return FEATURED_CITIES.find((c) => c.slug === slug);
}
