/**
 * Brand module — single source of truth for every user-facing brand
 * string and color.
 *
 * To rebrand:
 *   1. Edit `brand.config.json` for names, tagline, colors, email domain.
 *   2. Edit `/public/logo.svg` to change the visual mark + wordmark.
 *   3. Run `npm run brand:build` to regenerate the seven public SVG variants.
 *
 * NEVER inline brand strings in components. Import from here. NEVER inline
 * the logo paths either — use the BRAND_LOGOS constants below to point at
 * the appropriate /public asset.
 */

import brand from "../../brand.config.json";

/* ─── Text ─── */

export const BRAND_NAME        = brand.name;
export const BRAND_NAME_FIRST  = brand.nameFirst;   // "Culture"
export const BRAND_NAME_SECOND = brand.nameSecond;  // "Flow"
export const BRAND_TAGLINE     = brand.tagline;
export const BRAND_SHORT_TAG   = brand.shortTag;
export const BRAND_DESCRIPTION = brand.description;
export const BRAND_STATEMENT_DESCRIPTOR = brand.statementDescriptor;

/* ─── Email helpers ─── */

export const BRAND_EMAIL_DOMAIN = brand.emailDomain;

/**
 * Full email for a well-known inbox (help, press, partnerships, trust,
 * legal, privacy, copyright, abuse, support). Always returns
 * `{inbox}@{BRAND_EMAIL_DOMAIN}`.
 */
export function brandEmail(inbox: string): string {
  return `${inbox}@${BRAND_EMAIL_DOMAIN}`;
}

/* ─── Colors ─── */

export const BRAND_COLORS = brand.colors as {
  mark:    string;   // primary brand fill — savanna amber #D9930F (the horns)
  accent:  string;   // brighter savanna gold #F5B800 — buttons, highlights, pills
  ink:     string;   // body / strong text — deep ink #1E0A3C
  nile:    string;   // Nile blue #1B3A85 — wordmark + chrome
  cream:   string;   // light surface / off-white #FFFBF2
  muted:   string;   // small-caps / kicker text #39364F
};

/* ─── Logo asset map ───
 *  Every logo variant is a real file in /public produced by
 *  `scripts/build-brand-svgs.mjs` from the master `/logo.svg`. Components
 *  should reference these constants rather than hardcoding paths so a
 *  rename (or a path change) only happens once. */
export const BRAND_LOGOS = {
  /** Full lockup — mark on top, wordmark below, full canvas. */
  master:     "/logo.svg",
  /** Mark above wordmark, tight crop. Hero / login / brand spotlight. */
  stacked:    "/logo-stacked.svg",
  /** Mark left of wordmark. Headers, navigation, inline. */
  horizontal: "/logo-horizontal.svg",
  /** Mark only, full color. Favicons, tiles, ticket header bars. */
  mark:       "/logo-mark.svg",
  /** Mark only, currentColor. Inline-SVG contexts only — footers, button glyphs. */
  markMono:   "/logo-mark-mono.svg",
  /** Mark only, hard-coded white fill. Use with <img> on dark surfaces. */
  markWhite:  "/logo-mark-white.svg",
  /** Wordmark only. When the mark is implied or duplicated nearby. */
  wordmark:   "/logo-wordmark.svg",
  /** 64×64 mark on a brand-orange rounded square. PWA / app icons. */
  appIcon:    "/logo-app-icon.svg"
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGOS;

/* ─── Derived helpers ─── */

/** "© 2026 CultureFlow. Built for South Sudanese, wherever they are." */
export function copyrightLine(year: number = new Date().getFullYear()): string {
  return `© ${year} ${BRAND_NAME}. Built for South Sudanese, wherever they are.`;
}

/** ARIA label for the brand-home link used in Header / Footer / auth pages. */
export const BRAND_HOME_LABEL = `${BRAND_NAME} — home`;
