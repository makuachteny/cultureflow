/**
 * POST /api/tickets/check-in
 *   { code?: string, qrData?: string }
 *
 * Marks an ISSUED ticket as CHECKED_IN. The caller must be either the
 * event's organizer or an admin. Returns 404 if the ticket doesn't
 * exist, 403 on authz failure, 409 if the ticket is already checked in
 * or cancelled/refunded, 200 on success with ticket + event + tier.
 *
 * Accepts either the 6-char human code OR the opaque QR token; the
 * organizer's scanner app picks whichever it captured.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z
  .object({
    code:   z.string().trim().min(1).max(32).optional(),
    qrData: z.string().trim().min(1).max(128).optional()
  })
  .refine((d) => d.code || d.qrData, {
    message: "Provide either `code` or `qrData`."
  });

export async function POST(req: Request) {
  // Door staff scan often; ceiling stops a stuck loop.
  const limited = guard(req, "checkin", 120, 60000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { code, qrData } = parsed.data;
  const ticket = await prisma.ticket.findFirst({
    where: code ? { code } : { qrData },
    include: {
      event: { select: { id: true, slug: true, title: true, organizerId: true } },
      tier:  { select: { id: true, name: true } }
    }
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // Authz: organizer of this event, or admin.
  const isOwner = ticket.event.organizerId === gate.userId;
  const isAdmin = gate.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (ticket.status === "CHECKED_IN") {
    return NextResponse.json(
      {
        error: "Already checked in.",
        ticket: {
          id: ticket.id, code: ticket.code,
          attendeeName: ticket.attendeeName,
          tier: ticket.tier.name,
          event: { slug: ticket.event.slug, title: ticket.event.title },
          checkedInAt: ticket.checkedInAt
        }
      },
      { status: 409 }
    );
  }
  if (ticket.status === "CANCELLED" || ticket.status === "REFUNDED") {
    return NextResponse.json(
      { error: `Ticket is ${ticket.status.toLowerCase()} — not valid for entry.` },
      { status: 409 }
    );
  }

  const checkedInAt = new Date();
  await prisma.ticket.update({
    where: { id: ticket.id },
    data:  { status: "CHECKED_IN", checkedInAt }
  });

  return NextResponse.json({
    ok: true,
    ticket: {
      id: ticket.id, code: ticket.code,
      attendeeName: ticket.attendeeName,
      tier: ticket.tier.name,
      event: { slug: ticket.event.slug, title: ticket.event.title },
      checkedInAt
    }
  });
}
