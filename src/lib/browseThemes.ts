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
      lede: "Festivals, heritage days, cultural nights and traditional dance: the moments that remind us who we are, wherever we are."
    },
    image: "/community/cultural-performance.jpg",
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
      lede: "Concerts, DJ nights, live bands and music from every tradition. Find your people on the dancefloor."
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
      lede: "Workshops, panel discussions, heritage-language classes, and seminars from voices in your community you'd otherwise have to travel to hear."
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
      lede: "Services, festivals, retreats and prayer gatherings. Every faith, every tradition."
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
      lede: "Launches, trade fairs, conferences and industry mixers. Where community capital meets community ideas."
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
      eyebrow: "EVERYTHING ELSE",
      heading: "Things to do, {{accent}}wherever you are.{{/accent}}",
      lede: "The unsortable, the one-off, the surprising. Events that don't fit a label but bring people together."
    },
    image: "/community/cultural-confetti.jpg",
    pattern: null
  }
};

/* ────────── CITY THEMES ──────────
 * One per FEATURED_CITIES entry, keyed by normalised city name (see
 * `cityKey`). Cities without a theme fall back to the default hero. */
export const CITY_THEMES: Record<string, BrowseTheme> = {
  newyork: {
    key: "newyork",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "USA · FIVE BOROUGHS",
      heading: "Things to do in {{accent}}New York.{{/accent}}",
      lede: "From Queens night markets to Harlem jazz and Brooklyn block parties. Every culture in the city, on one calendar."
    },
    image: "/community/aux-1496442226666.jpg",
    pattern: "radial"
  },
  london: {
    key: "london",
    variant: "monumental",
    palette: {
      bg: "#000000", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#000000"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "UK · ZONE 1–6",
      heading: "Things to do in {{accent}}London.{{/accent}}",
      lede: "Diwali on Trafalgar Square, Notting Hill rehearsals, supper clubs and church halls across Greater London."
    },
    image: "/community/aux-1513635269975.jpg",
    pattern: "lines"
  },
  toronto: {
    key: "toronto",
    variant: "monumental",
    palette: {
      bg: "#DA121A", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#DA121A"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "CANADA · THE 6IX",
      heading: "Things to do in {{accent}}Toronto.{{/accent}}",
      lede: "One of the most diverse cities on earth. Lunar New Year, Caribana warm-ups, Eid dinners and community halls from Scarborough to Etobicoke."
    },
    image: "/community/aux-1517090504586.jpg",
    pattern: "radial"
  },
  lagos: {
    key: "lagos",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#078930"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "NIGERIA · LAGOS STATE",
      heading: "Things to do in {{accent}}Lagos.{{/accent}}",
      lede: "Afrobeats nights, owambe parties, art fairs and tech meetups from Ikeja to Victoria Island."
    },
    image: "/community/music-live-stage.jpg",
    pattern: "stripe"
  },
  nairobi: {
    key: "nairobi",
    variant: "monumental",
    palette: {
      bg: "#000000", fg: "#FFFFFF", accent: "#DA121A",
      accent2: "#DA121A", muted: "#C9D8F7", surface: "#000000"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "KENYA · GREEN CITY IN THE SUN",
      heading: "Things to do in {{accent}}Nairobi.{{/accent}}",
      lede: "Tech meetups, gospel nights, food festivals and community fundraisers across Nairobi."
    },
    image: "/community/theme-banner-2.jpg",
    pattern: "lines"
  },
  mumbai: {
    key: "mumbai",
    variant: "monumental",
    palette: {
      bg: "#DA121A", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#DA121A"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "INDIA · MAHARASHTRA",
      heading: "Things to do in {{accent}}Mumbai.{{/accent}}",
      lede: "Ganesh Chaturthi processions, Bollywood nights, comedy, food walks and gatherings across the city."
    },
    image: "/community/theme-banner-1.jpg",
    pattern: "radial"
  },
  saopaulo: {
    key: "saopaulo",
    variant: "monumental",
    palette: {
      bg: "#078930", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#078930"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "BRAZIL · SAMPA",
      heading: "Things to do in {{accent}}São Paulo.{{/accent}}",
      lede: "Samba rehearsals, festas juninas, Japanese-Brazilian festivals in Liberdade and concerts every night."
    },
    image: "/community/events-new-hero.jpg",
    pattern: "stripe"
  },
  mexicocity: {
    key: "mexicocity",
    variant: "monumental",
    palette: {
      bg: "#DA121A", fg: "#FFFFFF", accent: "#078930",
      accent2: "#078930", muted: "#C9D8F7", surface: "#DA121A"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "MEXICO · CDMX",
      heading: "Things to do in {{accent}}Mexico City.{{/accent}}",
      lede: "Día de Muertos altars, lucha libre, mariachi in Garibaldi and markets in every colonia."
    },
    image: "/community/music-concert-crowd.jpg",
    pattern: "radial"
  },
  paris: {
    key: "paris",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#DA121A",
      accent2: "#DA121A", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "FRANCE · ÎLE-DE-FRANCE",
      heading: "Things to do in {{accent}}Paris.{{/accent}}",
      lede: "Fête de la Musique, African and Caribbean diaspora nights, supper clubs and gallery openings."
    },
    image: "/community/theme-banner-2.jpg",
    pattern: "lines"
  },
  seoul: {
    key: "seoul",
    variant: "monumental",
    palette: {
      bg: "#000000", fg: "#FFFFFF", accent: "#DA121A",
      accent2: "#DA121A", muted: "#C9D8F7", surface: "#000000"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "SOUTH KOREA",
      heading: "Things to do in {{accent}}Seoul.{{/accent}}",
      lede: "K-food fairs, temple stays, hanbok days and concerts from Hongdae to Gangnam."
    },
    image: "/community/events-new-hero.jpg",
    pattern: "dots"
  },
  sydney: {
    key: "sydney",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "AUSTRALIA · NSW",
      heading: "Things to do in {{accent}}Sydney.{{/accent}}",
      lede: "Lunar New Year on the harbour, Diwali in Parramatta, community fundraisers and festivals all year."
    },
    image: "/community/aux-1506973035872.jpg",
    pattern: "radial"
  },
  juba: {
    key: "juba",
    variant: "monumental",
    palette: {
      bg: "#0F47AF", fg: "#FFFFFF", accent: "#FCDD09",
      accent2: "#FCDD09", muted: "#C9D8F7", surface: "#0F47AF"
    },
    fonts: { heading: F.bebas, body: F.inter },
    copy: {
      eyebrow: "SOUTH SUDAN · ON THE NILE",
      heading: "Things to do in {{accent}}Juba.{{/accent}}",
      lede: "Weddings, church, conferences and cultural nights in the capital, from Konyo Konyo to Hai Cinema."
    },
    image: "/community/diaspora-hero-2.jpg",
    pattern: "radial"
  }
};

/* ────────── Resolver ──────────
 * Accepts either the lowercase slug ("cultural") or the uppercase enum
 * key ("CULTURAL") that the Prisma/browse layer uses. Cities match on a
 * normalised key, so "São Paulo", "sao-paulo" and "SAO PAULO" all work.
 */
export function cityKey(city: string): string {
  return city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}

export function resolveTheme(opts: {
  category?: CategorySlug | string;
  city?: CitySlug | string;
}): BrowseTheme | null {
  if (opts.category) {
    const slug = String(opts.category).toLowerCase();
    if (slug in CATEGORY_THEMES) return CATEGORY_THEMES[slug as CategorySlug];
  }
  if (opts.city) {
    const key = cityKey(String(opts.city));
    if (key in CITY_THEMES) return CITY_THEMES[key];
  }
  return null;
}
