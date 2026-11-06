/**
 * browseThemes — per-category and per-city visual themes for the /browse page.
 *
 * Each theme defines its own palette, font pair, hero variant, pattern, and
 * section styling so that selecting "Music" or "London" produces a visually
 * distinct experience — not just a filtered grid.
 *
 * Variants:
 *   "editorial"  — serif, magazine layout, high whitespace (cultural, wedding, faith)
 *   "kinetic"    — bold display type, diagonal accents, stat strip (sports, business)
 *   "warm"       — organic blobs, photo-stack hero (family, community, fundraiser)
 *   "neon"       — dark, glow, waveform (music)
 *   "monumental" — oversized display with city photo wash (cities)
 *   "academic"   — classic, restrained, rule-lined (education, networking)
 *
 * Consumed by ThemedHero.tsx + ThemedSection.tsx.
 */

import type { CategorySlug, CitySlug } from "./taxonomy";

export type HeroVariant =
  | "editorial"
  | "kinetic"
  | "warm"
  | "neon"
  | "monumental"
  | "academic";

export interface BrowseTheme {
  key: string;
  variant: HeroVariant;
  /** ~6-char hex, used via inline style so we don't need to regenerate Tailwind. */
  palette: {
    bg: string;
    fg: string;
    accent: string;       // primary accent (chips, bars)
    accent2: string;      // secondary accent
    muted: string;        // supporting mid-tone
    surface: string;      // card background
  };
  fonts: {
    heading: string;      // CSS font-family string
    body: string;
  };
  /** Copy shown in the hero. `eyebrow` becomes the top kicker, `lede` the paragraph. */
  copy: {
    eyebrow: string;
    heading: string;       // may contain {{accent}} around words you want accented
    lede: string;
  };
  /** Optional hero-right image URL; variant decides how to use it. */
  image?: string;
  /** Background pattern token for the hero ("dots", "lines", "stripe", "radial", null). */
  pattern?: "dots" | "lines" | "stripe" | "radial" | "tartan" | null;
}

/* ────────── Shared font stacks ────────── *
 * The whole platform is Inter — themes get variety from weight + tracking,
 * not font family swaps. These keys are kept so existing theme objects
 * don't churn, but they all resolve to Inter. */
const INTER = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const F = {
  inter:   INTER,
  display: INTER,
  serif:   INTER,
  serif2:  INTER,
  mono:    INTER,
  bebas:   INTER,
  archivo: INTER,
  script:  INTER
};

/* ────────── CATEGORY THEMES ────────── */
export const CATEGORY_THEMES: Record<CategorySlug, BrowseTheme> = {
  cultural: {
    key: "cultural",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#FCDD09",
      accent2: "#DA121A", muted: "#7A5E20", surface: "#FFFFFF"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "HERITAGE · HOME · TOGETHER",
      heading: "Culture, {{accent}}carried forward.{{/accent}}",
      lede: "South Sudan Independence Day, cultural nights, traditional dance — the moments that remind us who we are, wherever we are."
    },
    image: "/community/cultural-dancers-flags.jpg",
    pattern: "tartan"
  },

  music: {
    key: "music",
    variant: "warm",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "// SOUND · LIVE · TOGETHER",
      heading: "{{accent}}Turn it up.{{/accent}}",
      lede: "Concerts, DJ nights, live bands and South Sudanese music showcases across the diaspora. Find your people on the dancefloor."
    },
    image: "/community/music-concert-crowd.jpg",
    pattern: "radial"
  },

  sports: {
    key: "sports",
    variant: "warm",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.archivo, body: F.inter },
    copy: {
      eyebrow: "// LEAGUES · TOURNAMENTS · WATCH PARTIES",
      heading: "Show up. {{accent}}Play hard.{{/accent}}",
      lede: "Youth basketball leagues, 5-a-side Saturdays, Bright Stars watch parties, AFCON gatherings. Our community goes harder together."
    },
    image: "/community/sports-football.jpg",
    pattern: "stripe"
  },

  education: {
    key: "education",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#0F47AF",
      accent2: "#DA121A", muted: "#5A574E", surface: "#FFFFFF"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "PROGRAMMES · WORKSHOPS · PANELS",
      heading: "Knowledge, {{accent}}passed on.{{/accent}}",
      lede: "Scholarship workshops, panel discussions, Dinka/Nuer language classes, and seminars from voices in our community you'd otherwise have to travel to hear."
    },
    image: "/community/education-books.jpg",
    pattern: "lines"
  },

  faith: {
    key: "faith",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#078930", accent: "#C4A26B",
      accent2: "#DA121A", muted: "#5A7376", surface: "#FFFFFF"
    },
    fonts: { heading: F.serif2, body: F.inter },
    copy: {
      eyebrow: "GATHER · WORSHIP · BELONG",
      heading: "Come as you are, {{accent}}leave held.{{/accent}}",
      lede: "Sunday services, revivals, conventions and quiet prayer breakfasts across the diaspora. Every tradition, every denomination."
    },
    image: "/community/faith-sanctuary.jpg",
    pattern: "radial"
  },

  networking: {
    key: "networking",
    variant: "warm",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.display, body: F.inter },
    copy: {
      eyebrow: "● LIVE · PROFESSIONALS · COMMUNITY",
      heading: "Build, ship, {{accent}}connect.{{/accent}}",
      lede: "Founder dinners, alumni mixers, industry meetups. The kind of rooms where you leave with a new business card and a new collaborator."
    },
    image: "/community/networking-hands.jpg",
    pattern: "dots"
  },

  wedding: {
    key: "wedding",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#DA121A",
      accent2: "#C4A26B", muted: "#8A5E6E", surface: "#FFFFFF"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "TRADITIONS · RECEPTIONS · CELEBRATIONS",
      heading: "Love, {{accent}}made visible.{{/accent}}",
      lede: "Dowry ceremonies, engagement parties, traditional receptions and bridal showers — the events our aunties have been waiting for."
    },
    image: "/community/wedding-celebration.jpg",
    pattern: "lines"
  },

  community: {
    key: "community",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#FCDD09",
      accent2: "#078930", muted: "#DA121A", surface: "#FFFFFF"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "TOWN HALLS · FORUMS · MEETUPS",
      heading: "Neighbours, {{accent}}by choice.{{/accent}}",
      lede: "Tribal association meetings, town halls, youth forums and the kind of community gatherings where the kids run wild and the elders tell stories."
    },
    image: "/community/community-outdoors.jpg",
    pattern: "dots"
  },

  business: {
    key: "business",
    variant: "warm",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.archivo, body: F.inter },
    copy: {
      eyebrow: "// 128 EVENTS THIS MONTH",
      heading: "Business, {{accent}}done here.{{/accent}}",
      lede: "Launches, trade fairs, conferences and industry mixers. Where South Sudanese capital meets South Sudanese ideas."
    },
    image: "/community/business-speaker.jpg",
    pattern: "lines"
  },

  fundraiser: {
    key: "fundraiser",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#078930", accent: "#0F47AF",
      accent2: "#FCDD09", muted: "#5A7376", surface: "#FFFFFF"
    },
    fonts: { heading: F.serif2, body: F.inter },
    copy: {
      eyebrow: "GIVE · GATHER · SEND HOME",
      heading: "Together, {{accent}}we move mountains.{{/accent}}",
      lede: "Scholarship drives, send-back-home appeals, charity galas and disaster response. The best of us, turned up."
    },
    image: "/community/cultural-performance.jpg",
    pattern: "radial"
  },

  family: {
    key: "family",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#DA121A",
      accent2: "#FCDD09", muted: "#000000", surface: "#FFFFFF"
    },
    fonts: { heading: F.script, body: F.inter },
    copy: {
      eyebrow: "KIDS · REUNIONS · ALL AGES",
      heading: "Family time, {{accent}}upgraded.{{/accent}}",
      lede: "Kids' programs, multi-generational reunions, storytimes and the Saturday barbecues that turn into wrestling matches."
    },
    image: "/community/family-together.jpg",
    pattern: "dots"
  },

  other: {
    key: "other",
    variant: "warm",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#0F47AF",
      accent2: "#FCDD09", muted: "#6F7287", surface: "#FFFFFF"
    },
    fonts: { heading: F.display, body: F.inter },
    copy: {
      eyebrow: "EVERYTHING ELSE · DIASPORA",
      heading: "Things to do, {{accent}}wherever you are.{{/accent}}",
      lede: "The unsortable, the one-off, the surprising. Events that don't fit a label but bring South Sudanese together."
    },
    image: "/community/cultural-confetti.jpg",
    pattern: null
  }
};

/* ────────── CITY THEMES ──────────
 * Keyed by the slugs we ship in FEATURED_CITIES. Each city is a major
 * South Sudanese hub at home or in the diaspora — copy speaks to that
 * audience directly.
 */
export const CITY_THEMES: Record<string, BrowseTheme> = {
  juba: {
    key: "juba",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "CENTRAL EQUATORIA · ON THE NILE",
      heading: "Things to do in {{accent}}Juba.{{/accent}}",
      lede: "From Konyo Konyo to Hai Cinema — weddings, church, conferences and cultural nights. The capital's calendar, in one place."
    },
    image: "/community/diaspora-hero-2.jpg",
    pattern: "radial"
  },
  wau: {
    key: "wau",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#078930", muted: "#C9D8F7", surface: "#3F7077"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "WESTERN BAHR EL GHAZAL",
      heading: "Things to do in {{accent}}Wau.{{/accent}}",
      lede: "Cultural nights, weddings, church gatherings and community meets across one of South Sudan's oldest cities."
    },
    image: "/community/diaspora-hero-1.jpg",
    pattern: "lines"
  },
  khartoum: {
    key: "khartoum",
    variant: "monumental",
    palette: {
      bg: "#DA121A", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#DA121A", muted: "#E4C8A8", surface: "#DA121A"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "WHERE THE BLUE & WHITE NILE MEET",
      heading: "Things to do in {{accent}}Khartoum.{{/accent}}",
      lede: "Diaspora weddings, community gatherings, and cultural events for South Sudanese living in and around Khartoum."
    },
    image: "/community/theme-banner-1.jpg",
    pattern: "radial"
  },
  nairobi: {
    key: "nairobi",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#078930", muted: "#C9D8F7", surface: "#3F7077"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "CENTRAL KENYA · HIGHLANDS",
      heading: "Things to do in {{accent}}Nairobi.{{/accent}}",
      lede: "From Kileleshwa to Kasarani — weddings, church conventions, community fundraisers, and cultural nights for the South Sudanese in Nairobi."
    },
    image: "/community/diaspora-hero-2.jpg",
    pattern: "lines"
  },
  kampala: {
    key: "kampala",
    variant: "monumental",
    palette: {
      bg: "#DA121A", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#DA121A", muted: "#E4C8A8", surface: "#DA121A"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "CENTRAL UGANDA · SEVEN HILLS",
      heading: "Things to do in {{accent}}Kampala.{{/accent}}",
      lede: "From Kololo to Ntinda — weddings, church services, networking evenings, and cultural nights for the South Sudanese diaspora in Kampala."
    },
    image: "/community/theme-banner-2.jpg",
    pattern: "lines"
  },
  cairo: {
    key: "cairo",
    variant: "monumental",
    palette: {
      bg: "#000000", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#FCDD09", surface: "#000000"
    },
    fonts: { heading: F.serif, body: F.inter },
    copy: {
      eyebrow: "GREATER CAIRO · ON THE NILE",
      heading: "Things to do in {{accent}}Cairo.{{/accent}}",
      lede: "Community halls and church gatherings across Maadi, Ain Shams, and 6th of October. The South Sudanese Cairo calendar."
    },
    image: "/community/diaspora-hero-1.jpg",
    pattern: "radial"
  },
  london: {
    key: "london",
    variant: "monumental",
    palette: {
      bg: "#FFFFFF", fg: "#000000", accent: "#DA121A",
      accent2: "#0F47AF", muted: "#666666", surface: "#FFFFFF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "UK · ZONE 1–6 · DIASPORA HUB",
      heading: "Things to do in {{accent}}London.{{/accent}}",
      lede: "From Newham to Croydon — South Sudanese weddings, church, cultural nights and community meets across Greater London."
    },
    image: "/community/aux-1513635269975.jpg",
    pattern: "stripe"
  },
  toronto: {
    key: "toronto",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#0F47AF", muted: "#C9D8F7", surface: "#078930"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "ONTARIO · THE SIX",
      heading: "Things to do in {{accent}}Toronto.{{/accent}}",
      lede: "Community halls from Scarborough to Etobicoke. Chapter meetings, weddings, cultural nights — Toronto's South Sudanese calendar."
    },
    image: "/community/aux-1517090504586.jpg",
    pattern: "lines"
  },
  calgary: {
    key: "calgary",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "ALBERTA · ROCKIES · YYC",
      heading: "Things to do in {{accent}}Calgary.{{/accent}}",
      lede: "One of North America's largest South Sudanese hubs. Weddings, fundraisers, church gatherings, and youth events from the NE to the SW."
    },
    image: "/community/aux-1517090504586.jpg",
    pattern: "radial"
  },
  melbourne: {
    key: "melbourne",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#078930"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "VICTORIA · GREATER MELBOURNE",
      heading: "Things to do in {{accent}}Melbourne.{{/accent}}",
      lede: "From Sunshine to Dandenong — weddings, cultural nights, basketball games and church gatherings for the South Sudanese-Australian community."
    },
    image: "/community/aux-1506973035872.jpg",
    pattern: "radial"
  },
  sydney: {
    key: "sydney",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#078930"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "HARBOURSIDE · NSW",
      heading: "Things to do in {{accent}}Sydney.{{/accent}}",
      lede: "Blacktown weddings, western-suburb meets, church services and community fundraisers for the South Sudanese in Sydney."
    },
    image: "/community/aux-1506973035872.jpg",
    pattern: "radial"
  },
  omaha: {
    key: "omaha",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "NEBRASKA · MIDWEST · OMA",
      heading: "Things to do in {{accent}}Omaha.{{/accent}}",
      lede: "Home to one of America's largest South Sudanese communities. Weddings, church, basketball, fundraisers — the Omaha calendar."
    },
    image: "/community/aux-1496442226666.jpg",
    pattern: "stripe"
  }
};

/* ────────── Resolver ──────────
 * Accepts either the lowercase slug ("cultural") or the uppercase enum
 * key ("CULTURAL") that the Prisma/browse layer uses. City is matched
 * by lowercased name so "London" and "london" both work.
 */
export function resolveTheme(opts: {
  category?: CategorySlug | string;
  city?: CitySlug | string;
}): BrowseTheme | null {
  if (opts.category) {
    const slug = String(opts.category).toLowerCase();
    if (slug in CATEGORY_THEMES) return CATEGORY_THEMES[slug as CategorySlug];
  }
  if (opts.city) {
    const slug = String(opts.city).toLowerCase().replace(/\s+/g, "");
    if (slug in CITY_THEMES) return CITY_THEMES[slug];
  }
  return null;
}
