/**
 * POST /api/onboarding
 *
 * Body: {
 *   interests:  string[]   // EventCategory keys
 *   tribe?:     string     // user's self-reported tribe (slug)
 *   city?:      string
 *   follow?:    string[]   // organizer ids to follow
 * }
 *
 * Called at the end of the /welcome wizard. Saves interests and follows,
 * stamps `onboardedAt`. Idempotent — you can re-submit to update prefs.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/taxonomy";

// Widen Set<Literal> to Set<string> so membership checks accept arbitrary input.
const VALID_INTERESTS: ReadonlySet<string> = new Set(CATEGORIES.map((c) => c.key));

const schema = z.object({
  interests: z.array(z.string()).max(12).default([]),
  // Free text — organizers and attendees name their own community. Trim,
  // cap length, and drop anything that looks like control chars.
  tribe:     z.string().trim().max(40).regex(/^[^\x00-\x1f]*$/).optional(),
  city:      z.string().trim().max(80).optional(),
  follow:    z.array(z.string().trim().min(1).max(40)).max(50).default([])
});

export async function POST(req: Request) {
  // Onboarding writes are once-per-user; throttle scripts.
  const limited = guard(req, "onboarding", 30, 60000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Sanitize against our taxonomies — silently drop anything unknown.
  const interests = d.interests.filter((k) => VALID_INTERESTS.has(k));
  const tribe     = d.tribe && d.tribe.length > 0 ? d.tribe : undefined;
  const city      = d.city || undefined;

  // Update the user record. `onboardedAt` gets set so they won't see
  // the welcome wizard again on their next visit.
  await prisma.user.update({
    where: { id: gate.userId },
    data: {
      // Cast pending `prisma generate` picking up the new schema fields.
      ...({ interests, onboardedAt: new Date() } as object),
      ...(tribe ? ({ tribe } as object) : {}),
      ...(city  ? { city } : {})
    }
  });

  // Create follows (skip-on-duplicate so re-submits don't blow up).
  if (d.follow.length > 0) {
    const valid = await prisma.user.findMany({
      where: { id: { in: d.follow }, role: { in: ["ORGANIZER", "ADMIN"] } },
      select: { id: true }
    });
    if (valid.length > 0) {
      await prisma.follow.createMany({
        data: valid.map((u) => ({
          followerId:  gate.userId,
          followingId: u.id
        })),
        skipDuplicates: true
      });
    }
  }

  return NextResponse.json({ ok: true });
}
