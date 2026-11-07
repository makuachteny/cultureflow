#!/usr/bin/env node
/**
 * Brand SVG generator — CultureFlow identity.
 *
 * The mark is a Nilotic long-horned cow — the animal at the centre of
 * Dinka and Nuer life — reduced to flat, sharp-edged shapes: open lyre
 * horns, a long face, angled ears. The flag's gold star sits cradled
 * between the horn tips. In full colour the horns are flag blue, so
 * the star sits on blue exactly as it does on the flag's hoist.
 *
 * The name is set as a two-line block, CULTURE / FLOW, in wide black
 * Archivo caps; FLOW takes the horn colour so the words belong to the
 * mark. Letter outlines come from scripts/brand/glyphs.json (see
 * make-glyphs.mjs) because these SVGs render as <img>, where web fonts
 * never load.
 *
 * No dependencies — runs in the predev/prebuild hooks. Rasters (PNG,
 * ICO) come from scripts/brand/render-pngs.mjs (`npm run brand:png`).
 *
 * Outputs (public/):
 *   logo.svg                     master — stacked, full colour
 *   logo-mark.svg                mark, full colour
 *   logo-mark-black.svg          mark, black + gold star
 *   logo-mark-white.svg          mark, white + gold star (dark backgrounds)
 *   logo-mark-mono.svg           mark, currentColor (inherits text colour)
 *   logo-horizontal.svg          mark + two-line name (header lockup)
 *   logo-horizontal-black.svg    one colour
 *   logo-horizontal-white.svg    reversed
 *   logo-stacked.svg             mark over name
 *   logo-stacked-black.svg
 *   logo-stacked-white.svg
 *   logo-wordmark.svg            name only, two lines
 *   logo-wordmark-black.svg
 *   logo-wordmark-white.svg
 *   logo-wordmark-line.svg       name only, one line (wide, short spaces)
 *   logo-app-icon.svg            512 blue tile, white cow (favicon / PWA)
 *   logo-app-icon-maskable.svg   same, mark inside the 80% safe zone
 *   logo-app-icon-yellow.svg     alternate tile: black cow on star yellow
 *
 * Run: `npm run brand:build`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const brand = JSON.parse(readFileSync(join(ROOT, "brand.config.json"), "utf8"));
const glyphs = JSON.parse(readFileSync(join(__dirname, "brand", "glyphs.json"), "utf8"));
const NAME = brand.name;

/* ─── Palette (South Sudanese flag) ─── */
const C = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#DA121A",
  green: "#078930",
  blue: "#0F47AF",
  yellow: "#FCDD09"
};

/* ─── Mark geometry — 200-wide grid, symmetric about x = 100 ───
 *  Content bbox: x 9.75–190.25, y 2–200. MARK_BOX pads it slightly. */
const GRID_W = 200;
const MARK_BOX = { x: 6, y: 0, w: 188, h: 202 };
const L = (x) => x;
const R = (x) => GRID_W - x;

// Lyre horn: leaves the poll, sweeps out and up, tip pointing skyward.
const horn = (f) =>
  `M${f(84)} 80C${f(60)} 76 ${f(40)} 68 ${f(33)} 50C${f(27)} 34 ${f(29)} 18 ${f(34)} 2` +
  `C${f(18)} 14 ${f(8)} 32 ${f(10)} 52C${f(12)} 78 ${f(40)} 94 ${f(80)} 96Z`;
// Long face: broad poll, taper to the muzzle, flared nose.
const FACE = [[80, 78], [120, 78], [125, 104], [115, 170], [119, 200], [81, 200], [85, 170], [75, 104]];
const EAR = (f) => [[f(77), 98], [f(46), 104], [f(40), 116], [f(79), 114]];
const NOSTRILS = [[88, 184, 7, 9], [105, 184, 7, 9]];
const pts = (a) => a.map(([x, y]) => `${x},${y}`).join(" ");

function starPoints(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    p.push([+(cx + rr * Math.cos(a)).toFixed(2), +(cy + rr * Math.sin(a)).toFixed(2)]);
  }
  return p;
}
const STAR = starPoints(100, 34, 15);

/** Mark with explicit fills. `nose` is the nostril colour (= background). */
function mark({ horns, head, star = C.yellow, nose }) {
  return `<path d="${horn(L)}" fill="${horns}"/><path d="${horn(R)}" fill="${horns}"/>` +
    `<polygon points="${pts(EAR(L))}" fill="${head}"/><polygon points="${pts(EAR(R))}" fill="${head}"/>` +
    `<polygon points="${pts(FACE)}" fill="${head}"/>` +
    NOSTRILS.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${nose}"/>`).join("") +
    `<polygon points="${pts(STAR)}" fill="${star}"/>`;
}

/** currentColor mark; nostrils are true holes (evenodd), so it works on any background. */
function markMono() {
  const ring = (a) => "M" + a.map(([x, y]) => `${x} ${y}`).join("L") + "Z";
  const holes = NOSTRILS.map(([x, y, w, h]) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`).join("");
  return `<g fill="currentColor"><path d="${horn(L)}"/><path d="${horn(R)}"/>` +
    `<polygon points="${pts(EAR(L))}"/><polygon points="${pts(EAR(R))}"/>` +
    `<path fill-rule="evenodd" d="${ring(FACE)}${holes}"/><polygon points="${pts(STAR)}"/></g>`;
}

/* Colourways: mark fills + the two lines of the name. */
const WAYS = {
  color: { mark: { horns: C.blue, head: C.black, nose: C.white }, l1: C.black, l2: C.blue },
  black: { mark: { horns: C.black, head: C.black, nose: C.white }, l1: C.black, l2: C.black },
  white: { mark: { horns: C.white, head: C.white, nose: C.black }, l1: C.white, l2: C.yellow }
};

/* ─── Name ─── */
const L1 = glyphs.line1, L2 = glyphs.line2, ONE = glyphs.oneLine;
const CAP = L1.h;                 // both lines share cap height (same axes)
const LEAD = 0.3;                 // gap between lines, × cap height
const nameW = (h) => (Math.max(L1.w, L2.w) * h) / CAP;
const nameH = (h) => h * (2 + LEAD);
/** Two-line name block, top-left at (x, y), each line `h` tall. Lines
 *  align on their ink, not on glyph side-bearings. */
function name(x, y, h, way) {
  const s = (h / CAP).toFixed(5);
  const line = (g, top, fill) =>
    `<path fill="${fill}" transform="translate(${x.toFixed(2)} ${top.toFixed(2)}) scale(${s}) translate(${-g.x} ${-g.y})" d="${g.d}"/>`;
  return line(L1, y, WAYS[way].l1) + line(L2, y + h * (1 + LEAD), WAYS[way].l2);
}
function nameOneLine(x, y, h, way) {
  const t = `transform="translate(${x} ${y}) scale(${(h / ONE.h).toFixed(5)}) translate(${-ONE.x} ${-ONE.y})"`;
  return `<path fill="${WAYS[way].l1}" ${t} d="${ONE.a}"/><path fill="${WAYS[way].l2}" ${t} d="${ONE.b}"/>`;
}

/** Place the mark so MARK_BOX lands at (x, y) with height h. */
function placeMark(inner, x, y, h) {
  const s = h / MARK_BOX.h;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)}) translate(${-MARK_BOX.x} ${-MARK_BOX.y})">${inner}</g>`;
}
const markW = (h) => (MARK_BOX.w * h) / MARK_BOX.h;

const svg = (w, h, body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}"${extra} role="img" aria-label="${NAME}">\n  ${body}\n</svg>\n`;

/* Mark only. */
const markSvg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}" role="img" aria-label="${NAME}">\n  ${inner}\n</svg>\n`;

/* Horizontal: mark 202 tall; the name block sits level with the face
 * (below the horns), each cap line ≈ 0.27 × mark height. */
const HM = MARK_BOX.h;
const HN = Math.round(HM * 0.27);
const H_GAP = 26;
const H_W = markW(HM) + H_GAP + nameW(HN);
const H_Y = HM * 0.66 - nameH(HN) / 2;
const horizontal = (way) =>
  svg(H_W, HM, placeMark(mark(WAYS[way].mark), 0, 0, HM) + name(markW(HM) + H_GAP, H_Y, HN, way));

/* Stacked: mark centred above the name block. */
const SN = 64;
const S_W = Math.max(nameW(SN), markW(HM));
const S_GAP = 30;
const S_H = HM + S_GAP + nameH(SN);
const stacked = (way) =>
  svg(S_W, S_H,
    placeMark(mark(WAYS[way].mark), (S_W - markW(HM)) / 2, 0, HM) +
    name((S_W - nameW(SN)) / 2, HM + S_GAP, SN, way));

/* Name only. */
const WN = 80;
const wordmarkSvg = (way) => svg(nameW(WN), nameH(WN), name(0, 0, WN, way));
const WL = 80;
const wordmarkLineSvg = svg((ONE.w * WL) / ONE.h, WL, nameOneLine(0, 0, WL, "color"));

/* App icons — 512 squares, square corners (platforms apply their own mask). */
const appIcon = (bg, fills, scale) => {
  const h = 512 * scale;
  return svg(512, 512,
    `<rect width="512" height="512" fill="${bg}"/>` + placeMark(mark(fills), (512 - markW(h)) / 2, (512 - h) / 2, h),
    ` width="512" height="512"`);
};

const outputs = {
  "logo.svg": stacked("color"),
  "logo-mark.svg": markSvg(mark(WAYS.color.mark)),
  "logo-mark-black.svg": markSvg(mark(WAYS.black.mark)),
  "logo-mark-white.svg": markSvg(mark(WAYS.white.mark)),
  "logo-mark-mono.svg": markSvg(markMono()),
  "logo-horizontal.svg": horizontal("color"),
  "logo-horizontal-black.svg": horizontal("black"),
  "logo-horizontal-white.svg": horizontal("white"),
  "logo-stacked.svg": stacked("color"),
  "logo-stacked-black.svg": stacked("black"),
  "logo-stacked-white.svg": stacked("white"),
  "logo-wordmark.svg": wordmarkSvg("color"),
  "logo-wordmark-black.svg": wordmarkSvg("black"),
  "logo-wordmark-white.svg": wordmarkSvg("white"),
  "logo-wordmark-line.svg": wordmarkLineSvg,
  "logo-app-icon.svg": appIcon(C.blue, { horns: C.white, head: C.white, nose: C.blue }, 0.7),
  "logo-app-icon-maskable.svg": appIcon(C.blue, { horns: C.white, head: C.white, nose: C.blue }, 0.56),
  "logo-app-icon-yellow.svg": appIcon(C.yellow, { horns: C.black, head: C.black, star: C.red, nose: C.yellow }, 0.7)
};

for (const [file, contents] of Object.entries(outputs)) {
  writeFileSync(join(PUBLIC, file), contents);
}
console.log(`brand: wrote ${Object.keys(outputs).length} SVGs to public/`);
// Aspect ratios consumed by src/lib/brand.ts — printed so drift after a
// geometry change is easy to spot.
console.log(
  `brand aspects: horizontal ${Math.ceil(H_W)}/${HM}, stacked ${Math.ceil(S_W)}/${Math.ceil(S_H)}, mark ${MARK_BOX.w}/${MARK_BOX.h}`
);
