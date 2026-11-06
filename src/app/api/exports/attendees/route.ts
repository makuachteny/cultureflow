/**
 * GET /api/exports/attendees
 * One row per issued/checked-in ticket on the organizer's events.
 * Useful for mail merges, badge printing, and check-in audits.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv, csvResponse, todayStamp } from "@/lib/csv";

export const dynamic = "force-dynamic";

/* Hard ceiling so a runaway export can't blow server memory. At this
 * size the CSV is ~10-15 MB, which the browser and most email pipes
 * can still ingest. Organizers with more tickets than this should
 * slice by event via the per-event dashboard export (not built yet —
 * tracked as follow-up). */
const EXPORT_CAP = 50_000;

export async function GET(req: Request) {
  const limited = guard(req, "exports-attendees", 10, 60000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const tickets = await prisma.ticket.findMany({
    where: {
      event: { organizerId: gate.userId },
      status: { in: ["ISSUED", "CHECKED_IN"] }
    },
    orderBy: { createdAt: "desc" },
    take: EXPORT_CAP,
    include: {
      event: { select: { title: true, slug: true, startsAt: true } },
      tier:  { select: { name: true, priceCents: true, currency: true } },
      order: { select: { id: true } }
    }
  });

  const rows = tickets.map((t) => ({
    ticket_code:    t.code,
    attendee_name:  t.attendeeName,
    attendee_email: t.attendeeEmail,
    status:         t.status,
    event:          t.event.title,
    event_slug:     t.event.slug,
    event_starts:   t.event.startsAt.toISOString(),
    tier:           t.tier.name,
    price_cents:    t.tier.priceCents,
    currency:       t.tier.currency,
    order_id:       t.order.id,
    checked_in_at:  t.checkedInAt ? t.checkedInAt.toISOString() : "",
    issued_at:      t.createdAt.toISOString()
  }));

  return csvResponse(toCsv(rows), `attendees-${todayStamp()}.csv`);
}
