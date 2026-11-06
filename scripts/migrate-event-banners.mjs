#!/usr/bin/env node
/**
 * Update event banner URLs in the live DB so they point at our local
 * `/community/<name>.jpg` files (which contain South Sudanese subjects
 * sourced from Wikimedia Commons).
 *
 * Strategy: pick a banner by EVENT-TITLE KEYWORDS rather than by the
 * old photo ID. The previous seed had a few mismatches (a soccer-pitch
 * photo on a music festival, etc.) — by re-mapping from the title we
 * get a thematically correct banner regardless of what the old URL was.
 *
 *   node scripts/migrate-event-banners.mjs            # apply
 *   node scripts/migrate-event-banners.mjs --dry-run  # preview
 */

import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");

/**
 * Ordered keyword → /community/ slot. First match wins, so list more
 * specific tokens before generic ones.
 */
const RULES = [
  // Faith first — "convention" otherwise lands on business
  { test: /gospel|church|prayer|sanctuary|service|mass|preacher|crusade|revival|convention|pentecostal/i, slot: "faith-sanctuary" },
  { test: /choir|congregation|youth ministry|elders forum/i,                                              slot: "faith-congregation" },

  // Weddings
  { test: /wedding|reception|engagement|dowry|nikah/i, slot: "wedding-celebration" },

  // Music
  { test: /concert|gig|dj |dj night|live band|showcase/i,           slot: "music-concert-crowd" },
  { test: /music|festival.*music|rising voices|songs of/i,           slot: "music-live-stage" },

  // Sports — "championship" first since it's specific
  { test: /championship|tournament|league|cup\b|playoff/i,           slot: "sports-tournament" },
  { test: /football|soccer|basketball|netball|volleyball|sports/i,   slot: "sports-football" },

  // Cultural / heritage
  { test: /heritage|independence|karibu|cultural night|cultural day|traditional/i, slot: "cultural-dancers-flags" },
  { test: /cultural|festival|carnival|food.*film|food.*festival/i,                  slot: "cultural-performance" },

  // Education / language
  { test: /workshop|class|seminar|panel|language|school|backpack|tutoring/i,        slot: "education-books" },

  // Family / kids
  { test: /family|kids|children|bbq|barbecue|reunion|playdate/i,                    slot: "family-together" },

  // Business / professional
  { test: /pitch|startup|tech\b|founder|meetup|women in (engineering|business|tech)/i, slot: "business-speaker" },
  { test: /business|conference|trade fair|professional|networking|alumni|mixer/i,   slot: "business-mixer" },

  // Fundraisers
  { test: /fundrais|scholarship|gala|charity|relief|appeal/i,                       slot: "cultural-performance" },

  // Community / town-hall fallback
  { test: /town hall|forum|community|tea\b|gathering|chapter/i,                     slot: "community-outdoors" }
];

function pickSlot(title) {
  for (const r of RULES) if (r.test.test(title)) return r.slot;
  return "diaspora-hero-1"; // safe warm fallback
}

async function main() {
  const prisma = new PrismaClient();

  // Touch every event whose banner is either an external URL or any
  // /community/ path — re-mapping is idempotent so safe to re-run.
  const events = await prisma.event.findMany({
    select: { id: true, title: true, bannerUrl: true }
  });

  console.log(`Scanning ${events.length} event(s)...`);

  let updated = 0, skipped = 0;
  for (const e of events) {
    const target = `/community/${pickSlot(e.title)}.jpg`;
    if (e.bannerUrl === target) {
      skipped++;
      continue;
    }
    const before = e.bannerUrl?.length > 60 ? e.bannerUrl.slice(0, 57) + "..." : e.bannerUrl;
    console.log(`  ${DRY ? "[dry]" : "→  "} ${e.title}\n         ${before} → ${target}`);
    if (!DRY) {
      await prisma.event.update({ where: { id: e.id }, data: { bannerUrl: target } });
      updated++;
    }
  }

  console.log("");
  console.log(`${DRY ? "Would update" : "Updated"}: ${DRY ? events.length - skipped : updated}`);
  console.log(`Already current:        ${skipped}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
