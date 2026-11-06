#!/usr/bin/env node
/**
 * One-shot swap: replace the prominent banner slots with a new batch of
 * Unsplash IDs, keeping the previous file as `<name>.v1.jpg` so revert is
 * a one-line rename.
 *
 *   node scripts/swap-community-photos.mjs
 *
 * The candidates here are *probabilistic* — picked from Unsplash IDs
 * that more often depict community / African / diaspora subjects, but
 * I (the agent) have no way to visually verify each frame. The user
 * should treat each swap as a starting point, not a final answer, and
 * replace any single file by dropping a new JPG with the same name.
 *
 * To restore the originals: rename `<name>.v1.jpg` → `<name>.jpg`, or
 * re-run `node scripts/download-community-photos.mjs --force` (which
 * uses the original IDs in that file's PHOTOS list).
 */

import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public/community");

// Slots to swap. Each entry: target filename → new Unsplash ID. Slots
// not listed keep their current image untouched. New IDs were live-probed
// before this list was committed; if a fetch 404s the swap aborts that
// slot and leaves the previous file intact.
const SWAPS = [
  { name: "cultural-dancers-flags", id: "photo-1547721064-da6cfb341d50" },
  { name: "cultural-performance",   id: "photo-1565538810643-b5bdb714032a" },
  { name: "cultural-celebration",   id: "photo-1582979512210-99b6a53386f9" },
  { name: "music-concert-crowd",    id: "photo-1605000797499-95a51c5269ae" },
  { name: "music-live-stage",       id: "photo-1525026198548-4baa812f1183" },
  { name: "wedding-celebration",    id: "photo-1520367445093-50dc08a59d9d" },
  { name: "faith-sanctuary",        id: "photo-1544717305-2782549b5136" },
  { name: "faith-congregation",     id: "photo-1517048676732-d65bc937f952" },
  { name: "family-together",        id: "photo-1517457373958-b7bdd4587205" },
  { name: "community-outdoors",     id: "photo-1542838132-92c53300491e" },
  { name: "networking-hands",       id: "photo-1542038784456-1ea8e935640e" },
  { name: "business-speaker",       id: "photo-1591115765373-5207764f72e7" },
  { name: "business-mixer",         id: "photo-1518709268805-4e9042af9f23" },
  { name: "education-books",        id: "photo-1529421308418-eab98863cee4" },
  { name: "diaspora-hero-1",        id: "photo-1505236858219-8359eb29e329" },
  { name: "diaspora-hero-2",        id: "photo-1516483638261-f4dbaf036963" },
  { name: "sports-tournament",      id: "photo-1569863959165-56dae551d4fc" }
];

const URL = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=75&auto=format&fit=crop`;

async function main() {
  let swapped = 0, kept = 0, failed = 0;
  const updates = {};

  for (const { name, id } of SWAPS) {
    const file = path.join(OUT_DIR, `${name}.jpg`);
    const v1   = path.join(OUT_DIR, `${name}.v1.jpg`);

    process.stdout.write(`  ${name}: fetch ${id} ...`);
    let buf;
    try {
      const res = await fetch(URL(id));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.log(` FAILED (${err.message}) — kept original`);
      failed++;
      continue;
    }

    // Backup the existing file as .v1.jpg if we don't have a backup yet.
    try {
      await fs.access(v1);
      // backup already present — don't overwrite (preserve the very first original)
      kept++;
    } catch {
      try {
        await fs.copyFile(file, v1);
      } catch {
        // file may not exist yet (new slot) — that's fine
      }
    }

    await fs.writeFile(file, buf);
    console.log(` ${(buf.length / 1024).toFixed(0)} KB ✓`);
    updates[name] = { newId: id };
    swapped++;
  }

  // Append-merge into MANIFEST.json so we keep the original IDs and
  // record what the swap layered on top.
  const manifestFile = path.join(OUT_DIR, "MANIFEST.json");
  const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  for (const [name, info] of Object.entries(updates)) {
    if (manifest[name]) {
      manifest[name].swappedTo = info.newId;
    }
  }
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

  console.log("");
  console.log(`✓ ${swapped} swapped, ${kept} backups already in place, ${failed} failed.`);
  console.log("  v1 backups: <name>.v1.jpg in public/community/");
  console.log("  Manifest:   public/community/MANIFEST.json (swappedTo field)");
}

main().catch((e) => { console.error(e); process.exit(1); });
