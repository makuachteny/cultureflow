#!/usr/bin/env node
/**
 * Replace prominent banner slots with verifiably-South-Sudanese photos
 * sourced from Wikimedia Commons (categories like "South Sudan",
 * "Culture of South Sudan", "Music of South Sudan", etc.).
 *
 * Why Commons:
 *   - Photos in those categories are *categorised by editors* as being
 *     about South Sudan, so the subject filter is much tighter than a
 *     generic Unsplash keyword.
 *   - Most are CC-BY or CC-BY-SA. Attribution is required — see the
 *     ATTRIBUTION.md file written alongside the images.
 *
 * Usage:
 *   node scripts/swap-commons-photos.mjs            # swap, keep v2 backup
 *   node scripts/swap-commons-photos.mjs --dry-run  # print plan, no fetch
 *
 * Each previous image is preserved as `<name>.v2.jpg` (the v1 backup
 * created by the earlier swap-community-photos.mjs run is left alone, so
 * you can revert two levels: v2 → v1 → original Unsplash).
 */

import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public/community");
const DRY     = process.argv.includes("--dry-run");

/**
 * Slot → Wikimedia Commons file title (without "File:" prefix). Picks
 * are based on each file's name and Commons category placement; descriptive
 * filenames let me match subject without seeing the image.
 */
const SWAPS = [
  { name: "cultural-dancers-flags", title: "South Sudan independence celebration in Juba.jpg" },
  { name: "cultural-performance",   title: "Colourfully traditional festival.jpg" },
  { name: "cultural-celebration",   title: "South Sudan independence celebration - Flickr - Al Jazeera English.jpg" },
  { name: "cultural-confetti",      title: "South Sudan Independence Day Celebration at Diversey Harbor Grove.jpg" },

  { name: "music-concert-crowd",    title: "Juba music concert - Flickr - Al Jazeera English.jpg" },
  { name: "music-live-stage",       title: "Juba music concert - Flickr - Al Jazeera English (1).jpg" },

  { name: "faith-sanctuary",        title: "Front view of Mary Queen Church in Juba south Sudan.jpg" },
  { name: "faith-congregation",     title: "Choir at southern Sudan referendum mass.jpg" },

  { name: "community-outdoors",     title: "South Sudanese crowd gathers on independence day (5925619257).jpg" },
  { name: "networking-hands",       title: "Africa Day Campaign Training attendance.png" },

  { name: "family-together",        title: "South Sudanese family preparing dinner.jpg" },

  { name: "business-speaker",       title: "Madol Arol Kachuol-attending a press confrence.jpg" },
  { name: "business-mixer",         title: "South Sudan Independence Day Celebration at Diversey Harbor Grove, July 9, 2011.jpg" },

  { name: "education-books",        title: "Education for out-of-school children, South Sudan (39018883394).jpg" },

  { name: "sports-football",        title: "Players From Nyinaken village of Majak Baai.jpg" },
  { name: "sports-pitch",           title: "South Sudan Northern Upper Nile State Renk Stadium.jpg" },
  { name: "sports-tournament",      title: "Peace tournament organized by CENET.jpg" },

  // Wedding: no clean Commons match in initial search. Reuse the
  // independence-celebration shot as a stand-in until a real wedding
  // file is sourced — the user has flagged this slot for replacement.
  { name: "wedding-celebration",    title: "South Sudan independence celebration - Flickr - Al Jazeera English 2.jpg" },

  { name: "diaspora-hero-1",        title: "Mother and child on South Sudans independence day (5926201660).jpg" },
  { name: "diaspora-hero-2",        title: "South Sudan Independence Day Celebration at Diversey Harbor Grove Independence Day, July 9, 2011.jpg" }
];

/**
 * Resolve a Commons file title to its CDN URL + license/attribution.
 */
async function resolveCommons(title) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("titles", `File:${title}`);
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url|extmetadata");
  api.searchParams.set("iiurlwidth", "1600");
  api.searchParams.set("format", "json");
  api.searchParams.set("origin", "*");

  const res = await fetch(api, { headers: { "User-Agent": "CultureFlow-CommunityPhotos/1.0 (https://cultureflow.example)" } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) throw new Error("No pages in response");
  const page = Object.values(pages)[0];
  if (page.missing !== undefined) throw new Error("File missing on Commons");
  const info = page.imageinfo?.[0];
  if (!info) throw new Error("No imageinfo");
  return {
    url:        info.thumburl ?? info.url,
    descPage:   info.descriptionurl,
    license:    info.extmetadata?.LicenseShortName?.value ?? "unknown",
    artist:     stripHtml(info.extmetadata?.Artist?.value ?? "unknown"),
    credit:     stripHtml(info.extmetadata?.Credit?.value ?? "")
  };
}

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function main() {
  const attribution = [];
  let swapped = 0, failed = 0;

  for (const { name, title } of SWAPS) {
    // Throttle: Wikimedia rate-limits aggressively for unauthenticated
    // bulk downloads. 1.2s between requests keeps us under the radar.
    if (swapped > 0 || failed > 0) await new Promise((r) => setTimeout(r, 1200));
    process.stdout.write(`  ${name}: resolving "${title}" ...`);
    let info;
    try {
      info = await resolveCommons(title);
    } catch (err) {
      console.log(` FAILED (${err.message}) — kept current`);
      failed++;
      continue;
    }

    if (DRY) {
      console.log(` ${info.url} [${info.license}]`);
      attribution.push({ name, title, ...info });
      continue;
    }

    let buf;
    let attempt = 0;
    const maxAttempts = 4;
    while (attempt < maxAttempts) {
      try {
        const r = await fetch(info.url, {
          headers: { "User-Agent": "CultureFlow-CommunityPhotos/1.0 (contact: ops@cultureflow.example)" }
        });
        if (r.status === 429 && attempt < maxAttempts - 1) {
          const wait = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
          process.stdout.write(` 429 retry-in-${wait/1000}s ...`);
          await new Promise((r) => setTimeout(r, wait));
          attempt++;
          continue;
        }
        if (!r.ok) throw new Error(`fetch ${r.status}`);
        buf = Buffer.from(await r.arrayBuffer());
        break;
      } catch (err) {
        if (attempt >= maxAttempts - 1) {
          console.log(` FAILED download (${err.message}) — kept current`);
          failed++;
          buf = null;
          break;
        }
        attempt++;
      }
    }
    if (!buf) continue;

    // Backup the current file as .v2.jpg if no v2 backup yet.
    const file = path.join(OUT_DIR, `${name}.jpg`);
    const v2   = path.join(OUT_DIR, `${name}.v2.jpg`);
    try {
      await fs.access(v2);
    } catch {
      try { await fs.copyFile(file, v2); } catch { /* file may not exist yet */ }
    }
    await fs.writeFile(file, buf);
    console.log(` ${(buf.length / 1024).toFixed(0)} KB ✓ [${info.license}]`);
    attribution.push({ name, title, ...info });
    swapped++;
  }

  // Write attribution file (CC-BY etc require credit on display).
  if (!DRY && attribution.length > 0) {
    const lines = [
      "# Image attribution",
      "",
      "Photos under `/public/community/` swapped in by `scripts/swap-commons-photos.mjs`",
      "are sourced from Wikimedia Commons. Licenses vary; most require attribution.",
      "Display this credit list on a public-facing /credits page.",
      ""
    ];
    for (const a of attribution) {
      lines.push(`## ${a.name}.jpg`);
      lines.push(`- File:    [${a.title}](${a.descPage})`);
      lines.push(`- Author:  ${a.artist}`);
      lines.push(`- License: ${a.license}`);
      if (a.credit) lines.push(`- Credit:  ${a.credit}`);
      lines.push("");
    }
    await fs.writeFile(path.join(OUT_DIR, "ATTRIBUTION.md"), lines.join("\n"));
  }

  console.log("");
  if (DRY) {
    console.log(`Plan: ${attribution.length} swaps (dry run, nothing fetched).`);
  } else {
    console.log(`✓ ${swapped} swapped, ${failed} failed.`);
    console.log("  v2 backups: <name>.v2.jpg in public/community/");
    console.log("  Attribution: public/community/ATTRIBUTION.md");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
