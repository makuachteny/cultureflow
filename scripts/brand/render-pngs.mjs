#!/usr/bin/env node
/**
 * Rasterises the brand SVGs (run `npm run brand:build` first) into the
 * PNG/ICO files browsers, phones and social cards need:
 *
 *   public/favicon.ico              16 / 32 / 48 (PNG-in-ICO)
 *   public/apple-touch-icon.png     180
 *   public/icons/icon-192.png       PWA
 *   public/icons/icon-512.png       PWA
 *   public/icons/icon-maskable-512.png  PWA (Android adaptive mask)
 *   public/og-image.png             1200×630 social share card
 *
 * Uses headless Chromium via Playwright so the PNGs match the SVGs
 * pixel-for-pixel. Run: `npm run brand:png`. Commit the outputs — this
 * is not part of the build.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "..", "public");
const glyphs = JSON.parse(readFileSync(join(__dirname, "glyphs.json"), "utf8"));
const dataUri = (file) =>
  "data:image/svg+xml;base64," + readFileSync(join(PUBLIC, file)).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage();

/** Render an HTML body at w×h and return PNG bytes. */
async function render(body, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${body}</body></html>`
  );
  await page.waitForTimeout(50);
  return page.screenshot({ type: "png", omitBackground: false });
}
const img = (file, w, h) => `<img src="${dataUri(file)}" width="${w}" height="${h}" style="display:block">`;

mkdirSync(join(PUBLIC, "icons"), { recursive: true });

const out = {
  "apple-touch-icon.png": await render(img("logo-app-icon.svg", 180, 180), 180, 180),
  "icons/icon-192.png": await render(img("logo-app-icon.svg", 192, 192), 192, 192),
  "icons/icon-512.png": await render(img("logo-app-icon.svg", 512, 512), 512, 512),
  "icons/icon-maskable-512.png": await render(img("logo-app-icon-maskable.svg", 512, 512), 512, 512)
};

/* Social card: blue hoist panel with the white cow, then the name and
 * tagline on white, the bead strip along the bottom edge. */
const T = glyphs.tagline;
const tagline = `<svg viewBox="${T.x} ${T.y} ${T.w} ${T.h}" height="34" style="display:block"><path d="${T.d}" fill="#000"/></svg>`;
const beads = "repeating-linear-gradient(90deg,#DA121A 0 22px,#000 22px 26px,#FCDD09 26px 48px,#000 48px 52px,#0F47AF 52px 74px,#000 74px 78px,#fff 78px 100px,#000 100px 104px,#078930 104px 126px,#000 126px 130px)";
out["og-image.png"] = await render(`
  <div style="position:relative;width:1200px;height:630px;background:#fff;display:flex">
    <div style="width:430px;height:600px;background:#0F47AF;display:flex;align-items:center;justify-content:center;border-right:6px solid #000">
      ${img("logo-mark-white.svg", 280, 301)}
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 70px">
      ${img("logo-wordmark.svg", 560, 245)}
      <div style="margin-top:36px">${tagline}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:30px;background:${beads};border-top:6px solid #000"></div>
  </div>`, 1200, 630);

/* favicon.ico — PNG-encoded entries (supported by every current browser). */
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const s of icoSizes) icoPngs.push(await render(img("logo-app-icon.svg", s, s), s, s));
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(icoPngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += icoPngs[i].length;
});
out["favicon.ico"] = Buffer.concat([header, ...icoPngs]);

await browser.close();
for (const [file, bytes] of Object.entries(out)) {
  writeFileSync(join(PUBLIC, file), bytes);
  console.log(`wrote public/${file} (${Math.round(bytes.length / 1024)} KB)`);
}
