#!/usr/bin/env node
/**
 * Brand SVG generator — compact horizontal lockup.
 *
 *   Mark      → extracted from `/logo.svg` (the hand-drawn horns), recoloured.
 *   Wordmark  → live SVG <text> "cultureflow" (all lowercase), Inter 800.
 *   Tagline   → none. Removed for the compact monochrome lockup.
 *
 * Both mark and wordmark render in the SAME warm amber, sized to look
 * like one composed object (mark visual height ≈ wordmark ascender height).
 *
 * Inputs:  /public/logo.svg  (the master — edit this to change the art)
 *
 * Outputs to /public:
 *   logo-stacked.svg     mark above wordmark, hero size
 *   logo-horizontal.svg  mark left of wordmark, compact lockup
 *   logo-mark.svg        mark only, tight crop
 *   logo-mark-mono.svg   mark only, currentColor (inline-SVG contexts)
 *   logo-mark-white.svg  mark only, hard-coded white (for <img> on dark bg)
 *   logo-wordmark.svg    wordmark only
 *   logo-app-icon.svg    64×64 PWA / favicon — gold horns on a Nile-blue tile
 *
 * Run: `npm run brand:build`. Auto-runs via predev/prebuild hooks.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const PUBLIC    = join(ROOT, "public");
// Master logo lives in /public — it's the canonical asset the rest of
// the app references at /logo.svg, and there's no reason to also keep
// a duplicate at the project root. All variants are derived from this
// single source.
const MASTER    = join(PUBLIC, "logo.svg");

const brand     = JSON.parse(readFileSync(join(ROOT, "brand.config.json"), "utf8"));
const NAME      = brand.name;
const master    = readFileSync(MASTER, "utf8");

/* ─── Brand colours ───
 *  Mark     → warm amber-gold (the spotlight)
 *  Wordmark → Nile blue       (anchored, readable as text on white)   */
const BRAND_AMBER    = "#D9930F";
const NILE_BLUE      = "#1B3A85";
const MARK_COLOR     = BRAND_AMBER;
const WORDMARK_COLOR = NILE_BLUE;

/* ─── Extract the mark from the master ─── */
const defsMatch = master.match(/<defs>[\s\S]*?<\/defs>/);
const defs      = defsMatch ? defsMatch[0] : "";

/* Bolden the mark by adding a brand-coloured stroke around each filled
 *  path. The stroke runs in the same colour as the fill so it just thickens
 *  the silhouette — gives the horns more visual weight to balance the
 *  enlarged wordmark beside them. stroke-width is in master coordinates
 *  (mark spans ~270 units tall), so 8 ≈ 3% of mark height.               */
const MARK_STROKE_WIDTH = 8;
const markGroups = [...master.matchAll(/<g clip-path="url\(#[^"]+\)">[\s\S]*?<\/g>/g)]
  .map((m) => m[0]
    .replace(/fill="#[0-9a-fA-F]+"/g, `fill="${MARK_COLOR}"`)
    .replace(/<path /g, `<path stroke="${MARK_COLOR}" stroke-width="${MARK_STROKE_WIDTH}" stroke-linejoin="round" `))
  .join("\n  ");

if (!markGroups) {
  console.error("ERROR: Could not extract mark from logo.svg.");
  process.exit(1);
}

const recolor = (svg, from, to) => svg.replace(new RegExp(from, "g"), to);

const SANS = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* The wordmark is rendered as live SVG text, CamelCase ("CultureFlow").
 *  We do NOT use the master's letterform paths in the lockups — the live
 *  SVG <text> renders the brand wordmark the brand goes by in the
 *  compact lockup used in the chrome.
 *
 *  Inter 500 metrics (used for layout math below):
 *    cap height ≈ 0.71 × fontSize
 *    x-height   ≈ 0.52 × fontSize
 *    ascender   ≈ 0.75 × fontSize
 *
 *  Wordmark width approx: "CultureFlow" ≈ 5.4 em at Inter 500 with the
 *  negative tracking we apply (-1.2% of fontSize). The character mix is
 *  C(0.66) u(0.55) l(0.23) t(0.34) u(0.55) r(0.36) e(0.55) F(0.55)
 *  l(0.23) o(0.59) w(0.83) ≈ 5.44 em, then tracking pulls it to 5.4. */
const WORDMARK_TEXT = "CultureFlow";
const ASCENDER_RATIO = 0.75;
const WORDMARK_EM_WIDTH = 5.4;

function wordmarkText({ x, y, fontSize, anchor = "start", color = WORDMARK_COLOR }) {
  const ls = (-fontSize * 0.012).toFixed(2);
  // Weight 500 (medium) — quiet typographic weight, lets the bold mark lead.
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${SANS}" font-size="${fontSize}" font-weight="500" letter-spacing="${ls}" fill="${color}">${WORDMARK_TEXT}</text>`;
}

function approxWordmarkWidth(fontSize) {
  return WORDMARK_TEXT.length * fontSize * (WORDMARK_EM_WIDTH / WORDMARK_TEXT.length);
}

/* ─── Variant viewBoxes ─── */
const MARK_BOX     = "540 535 410 280";
const WORDMARK_BOX = "0 0 600 130";

/* Horizontal lockup — compact, header-first.
 *  The wordmark fontSize is sized so its CAP-HEIGHT matches the mark
 *  height — capitals "C" / "F" stand at the same height as the horns,
 *  reading as visually equal in size. ViewBox width is sized to contain
 *  the full wordmark with comfortable right padding so no glyph clips. */
const HORIZ_W = 1130;
const HORIZ_H = 200;

const horizontalSvg = (() => {
  const markScale  = 0.40;                                       // mark height = 108
  const markH      = 270 * markScale;                            // 108
  // Wordmark cap-height set to ~80% of the mark height so the horns
  // visually lead — the wordmark sits beside the mark as a quieter
  // companion rather than competing for visual weight. Inter cap-height
  // is ~0.71 × fontSize.
  const CAP_RATIO    = 0.71;
  const CAP_TO_MARK  = 0.80;                                     // wordmark / mark height
  const wordFont     = (markH * CAP_TO_MARK) / CAP_RATIO;        // ≈ 122
  const capHeight    = CAP_RATIO * wordFont;                     // ≈ 86
  const midY       = HORIZ_H / 2;                                // 100
  const markTopY   = midY - markH / 2;                           // 46
  // Centre the cap-height block on midY: top of caps aligns with top
  // of horns, baseline aligns with bottom of horns. Ascenders (l, t, f)
  // peek slightly above — standard typographic behaviour, looks polished.
  const baselineY  = midY + capHeight / 2;
  const markCx     = 90;                                         // mark visual center x
  const wordX      = 250;                                        // wordmark left edge x — leaves a comfortable gap between the horns and the wordmark, scaled so the gap feels proportional to the chrome breathing room

  const dxMark = (markCx - markScale * 745).toFixed(2);
  const dyMark = (markTopY - markScale * 535).toFixed(2);        // master mark top y = 535

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HORIZ_W} ${HORIZ_H}" role="img" aria-label="${NAME}">
  ${defs}
  <g transform="translate(${dxMark} ${dyMark}) scale(${markScale})">
    ${markGroups}
  </g>
  ${wordmarkText({ x: wordX, y: baselineY.toFixed(2), fontSize: wordFont.toFixed(2) })}
</svg>
`;
})();

/* Stacked lockup — mark on top, wordmark below. Hero / login spots. */
const STACKED_W = 720;
const STACKED_H = 480;
const stackedSvg = (() => {
  const cx        = STACKED_W / 2;        // 360
  const markScale = 0.95;                 // near-full size
  const markCy    = 180;
  const dxMark    = (cx - markScale * 745).toFixed(2);
  const dyMark    = (markCy - markScale * 665).toFixed(2);
  const wordFont  = 110;
  const wordY     = 420;                  // baseline
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STACKED_W} ${STACKED_H}" role="img" aria-label="${NAME}">
  ${defs}
  <g transform="translate(${dxMark} ${dyMark}) scale(${markScale})">
    ${markGroups}
  </g>
  ${wordmarkText({ x: cx, y: wordY, fontSize: wordFont, anchor: "middle" })}
</svg>
`;
})();

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_BOX}" role="img" aria-label="${NAME}">
  ${defs}
  ${markGroups}
</svg>
`;

const monoMarkSvg = (() => {
  const monoMark = recolor(markGroups, `fill="${MARK_COLOR}"`, 'fill="currentColor"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_BOX}" role="img" aria-label="${NAME}">
  ${defs}
  ${monoMark}
</svg>
`;
})();

const whiteMarkSvg = (() => {
  const whiteMark = recolor(markGroups, `fill="${MARK_COLOR}"`, 'fill="#FFFFFF"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_BOX}" role="img" aria-label="${NAME}">
  ${defs}
  ${whiteMark}
</svg>
`;
})();

const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK_BOX}" role="img" aria-label="${NAME}">
  ${wordmarkText({ x: 300, y: 100, fontSize: 100, anchor: "middle" })}
</svg>
`;

/* App icon / favicon —
 *  Solid Nile-blue rounded-square so the icon has presence on every
 *  browser tab (light AND dark). The previous transparent variant had
 *  dark amber horns vanishing into white tabs at 16×16. Horns are now
 *  vivid brand gold (#F5B800) on the blue tile — maximum contrast at
 *  the smallest sizes, no thin strokes. Mark scaled up to fill ~92%
 *  of the canvas so the silhouette dominates the tab.
 *
 *  Strokes from `markGroups` are stripped here — at favicon size
 *  the outline noise hurts legibility; a clean filled silhouette
 *  reads cleaner than a thin-outlined one. */
const FAVICON_COLOR = "#F5B800"; // vivid brand gold — pops on the blue tile
const FAVICON_BG    = NILE_BLUE; // matches the wordmark colour
const appIconSvg = (() => {
  const scale = 70 / 410;                          // mark width ~70 of 64 (~92% after centering)
  const tx    = (32 - 745 * scale).toFixed(3);
  const ty    = (32 - 665 * scale).toFixed(3);
  // Strip the stroke="…" attributes the master adds for the rest of
  // the lockup — keeps the favicon a clean silhouette.
  const filled = recolor(markGroups, `fill="${MARK_COLOR}"`, `fill="${FAVICON_COLOR}"`)
    .replace(/stroke="[^"]+"/g, 'stroke="none"')
    .replace(/stroke-width="[^"]+"/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${NAME}">
  ${defs}
  <rect width="64" height="64" rx="13" ry="13" fill="${FAVICON_BG}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    ${filled}
  </g>
</svg>
`;
})();

/* ─── Write all variants ───
 *  `logo.svg` is intentionally NOT in this list — it IS our master
 *  source (see MASTER above), so writing it back would either be a
 *  no-op or corrupt the source if anything in the script ever
 *  diverged. Edit /public/logo.svg directly to change the artwork. */
const outputs = [
  ["logo-stacked.svg",     stackedSvg],
  ["logo-horizontal.svg",  horizontalSvg],
  ["logo-mark.svg",        markSvg],
  ["logo-mark-mono.svg",   monoMarkSvg],
  ["logo-mark-white.svg",  whiteMarkSvg],
  ["logo-wordmark.svg",    wordmarkSvg],
  ["logo-app-icon.svg",    appIconSvg]
];

for (const [name, contents] of outputs) {
  writeFileSync(join(PUBLIC, name), contents);
  console.log(`wrote public/${name}`);
}

console.log(`\n✓ Regenerated ${outputs.length} brand SVGs from logo.svg + brand.config.json.`);
