/**
 * GET /api/account/export
 *
 * GDPR / data-portability endpoint. Returns a JSON archive of every
 * personal record we hold for the authenticated user:
 *
 *   • profile         — User row (sans password hash)
 *   • orders          — Orders + line-item totals
 *   • tickets         — Tickets with code, status, check-in time
 *   • events          — Events the user organizes (if any)
 *   • follows         — Organizers the user follows
 *   • likes           — Events the user has liked
 *   • comments        — Comments the user has authored (VISIBLE + HIDDEN;
 *                       DELETED-state comments are already scrubbed)
 *
 * The response is a streamed JSON download with a dated filename so
 * browsers save it to disk rather than rendering inline.
 *
 * Rate-limited to 5 exports / hour / user — the query touches a lot of
 * rows and we don't want this endpoint becoming an abuse vector.
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`export:${gate.userId}`, 5, 60 * 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many export requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const [profile, orders, tickets, events, follows, likes, comments] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: gate.userId },
      // Explicitly enumerate fields — the password hash never leaves
      // the server, not even in a user's own export.
      select: {
        id: true, email: true, name: true, image: true, bio: true,
        city: true, country: true, tribe: true, website: true,
        role: true, status: true, interests: true,
        onboardedAt: true, createdAt: true, updatedAt: true
      }
    }),
    prisma.order.findMany({
      where:  { userId: gate.userId },
      select: {
        id: true, status: true, totalCents: true, currency: true,
        eventId: true, createdAt: true, updatedAt: true,
        event: { select: { title: true, slug: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.ticket.findMany({
      where:  { userId: gate.userId },
      select: {
        id: true, code: true, status: true,
        attendeeName: true, attendeeEmail: true,
        eventId: true, tierId: true, orderId: true,
        checkedInAt: true, createdAt: true,
        event: { select: { title: true, slug: true, startsAt: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.event.findMany({
      where:  { organizerId: gate.userId },
      select: {
        id: true, slug: true, title: true, status: true,
        category: true, type: true, city: true, country: true,
        startsAt: true, endsAt: true, createdAt: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.follow.findMany({
      where:  { followerId: gate.userId },
      select: {
        followingId: true, createdAt: true,
        following: { select: { name: true, email: true } }
      }
    }),
    prisma.like.findMany({
      where:  { userId: gate.userId },
      select: {
        eventId: true, createdAt: true,
        event: { select: { title: true, slug: true } }
      }
    }),
    prisma.comment.findMany({
      where:  { userId: gate.userId, status: { not: "DELETED" } },
      select: {
        id: true, body: true, status: true, eventId: true,
        createdAt: true,
        event: { select: { title: true, slug: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const archive = {
    schema:     "cultureflow.account.export.v1",
    exportedAt: new Date().toISOString(),
    profile,
    orders,
    tickets,
    events,
    follows,
    likes,
    comments
  };

  log.info("account export generated", {
    userId: gate.userId,
    counts: {
      orders:   orders.length,
      tickets:  tickets.length,
      events:   events.length,
      follows:  follows.length,
      likes:    likes.length,
      comments: comments.length
    }
  });

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      "Content-Type":        "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cultureflow-${today}.json"`,
      "Cache-Control":       "no-store"
    }
  });
}
