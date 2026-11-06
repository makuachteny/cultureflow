#!/usr/bin/env node
/**
 * Pull every Unsplash photo ID we reference into /public/community/ as
 * local JPGs. After this runs, the app no longer hits the Unsplash CDN
 * for any first-party imagery — replacing a photo is a one-file swap.
 *
 *   node scripts/download-community-photos.mjs
 *
 * Re-running is safe and idempotent (skips files that already exist).
 * To force a re-download, delete the file or pass --force.
 *
 * Naming: each photo gets a semantic filename based on its role in the
 * UI (cultural-dancers, music-crowd, faith-sanctuary, etc.) so source
 * files read clearly. The photo-ID is captured in MANIFEST.json so we
 * can trace the origin of every file.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("public/community");
const FORCE   = process.argv.includes("--force");

// Semantic filename → Unsplash photo ID. The role/theme each one fills
// is in the comment beside it.
const PHOTOS = [
  // Cultural / heritage
  { name: "cultural-dancers-flags", id: "photo-1519750157634-b6d493a0f77c", role: "cultural night, dancers with flags" },
  { name: "cultural-performance",   id: "photo-1532629345422-7515f3d16bb6", role: "cultural performance / donation hands" },
  { name: "cultural-celebration",   id: "photo-1501281668745-f7f57925c3b4", role: "outdoor celebration" },
  { name: "cultural-confetti",      id: "photo-1492684223066-81342ee5ff30", role: "celebration confetti / 'other' category" },

  // Music
  { name: "music-concert-crowd",    id: "photo-1470225620780-dba8ba36b745", role: "concert crowd" },
  { name: "music-live-stage",       id: "photo-1501386761578-eac5c94b800a", role: "live music stage" },

  // Sports
  { name: "sports-football",        id: "photo-1517649763962-0c623066013b", role: "football match" },
  { name: "sports-pitch",           id: "photo-1459749411175-04bf5292ceea", role: "stadium pitch" },
  { name: "sports-tournament",      id: "photo-1431324155629-1a6deb1dec8d", role: "tournament action shot" },

  // Education / learning
  { name: "education-books",        id: "photo-1503676260728-1c00da094a0b", role: "books / learning workshop" },

  // Faith
  { name: "faith-sanctuary",        id: "photo-1507692049790-de58290a4334", role: "sanctuary light" },
  { name: "faith-congregation",     id: "photo-1511795409834-ef04bbd61622", role: "congregation gathering" },

  // Networking / community
  { name: "networking-hands",       id: "photo-1556761175-5973dc0f32e7", role: "networking handshake" },
  { name: "community-outdoors",     id: "photo-1529156069898-49953e39b3ac", role: "community group outdoors" },

  // Wedding
  { name: "wedding-celebration",    id: "photo-1519741497674-611481863552", role: "wedding scene" },

  // Business
  { name: "business-speaker",       id: "photo-1556761175-b413da4baf72", role: "conference speaker" },
  { name: "business-mixer",         id: "photo-1515169067868-5387ec356754", role: "business mixer" },

  // Family
  { name: "family-together",        id: "photo-1511895426328-dc8714191300", role: "family together" },

  // Diaspora hero (broad warm scenes)
  { name: "diaspora-hero-1",        id: "photo-1518684079-3c830dcef090", role: "diaspora hero scene" },
  { name: "diaspora-hero-2",        id: "photo-1469854523086-cc02fe5d8800", role: "diaspora hero scene" },

  // Generic browse-theme banners
  { name: "theme-banner-1",         id: "photo-1570168007204-dfb528c6958f", role: "browse-theme banner" },
  { name: "theme-banner-2",         id: "photo-1531058020387-3be344556be6", role: "browse-theme banner" },

  // Auxiliary / unknown current usage but referenced somewhere
  { name: "aux-1496442226666",      id: "photo-1496442226666-8d4d0e62e6e9", role: "auxiliary marketing image" },
  { name: "aux-1506973035872",      id: "photo-1506973035872-a4ec16b8e8d9", role: "auxiliary marketing image" },
  { name: "aux-1513635269975",      id: "photo-1513635269975-59663e0ac1ad", role: "auxiliary marketing image" },
  { name: "aux-1517090504586",      id: "photo-1517090504586-fde19ea6066f", role: "auxiliary marketing image" },
  { name: "events-new-hero",        id: "photo-1533174072545-7a4b6ad7a6c3", role: "create-event page hero" }
];

const URL = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=75&auto=format&fit=crop`;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const manifest = {};
  let downloaded = 0, skipped = 0, failed = 0;

  for (const { name, id, role } of PHOTOS) {
    const file = path.join(OUT_DIR, `${name}.jpg`);
    manifest[name] = { id, role, file: `/community/${name}.jpg` };

    if (!FORCE && existsSync(file)) {
      skipped++;
      continue;
    }

    process.stdout.write(`  fetch ${name} ...`);
    try {
      const res = await fetch(URL(id));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(file, buf);
      console.log(` ${(buf.length / 1024).toFixed(0)} KB`);
      downloaded++;
    } catch (err) {
      console.log(` FAILED (${err.message})`);
      failed++;
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, "MANIFEST.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  console.log("");
  console.log(`✓ ${downloaded} downloaded, ${skipped} already-present, ${failed} failed.`);
  console.log(`  Manifest: public/community/MANIFEST.json`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
