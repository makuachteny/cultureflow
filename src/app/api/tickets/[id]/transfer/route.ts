import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/tickets/[id]/transfer
 *
 * Reassign a ticket to a different attendee. Updates `attendeeName` /
 * `attendeeEmail` on the ticket; if a User exists for the target email,
 * also reassigns `userId` so the new owner sees the ticket under their
 * "My tickets." Writes an audit row to `TicketTransfer`.
 *
 * Preconditions:
 *   • authenticated
 *   • ticket belongs to the authenticated user
 *   • ticket is ISSUED (transferring a CHECKED_IN or CANCELLED ticket
 *     makes no sense)
 *   • event hasn't started yet (no mid-event transfers)
 *   • target email isn't the same as current attendee email
 */

const schema = z.object({
  toEmail: z.string().trim().toLowerCase().email("Valid email required"),
  toName:  z.string().trim().min(1, "Name required").max(120)
});

// 10 transfers per hour per IP.
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`transfer:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many transfer attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { toEmail, toName } = parsed.data;

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { event: { select: { startsAt: true } } }
  });
  if (!ticket || ticket.userId !== gate.userId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status !== "ISSUED") {
    return NextResponse.json(
      { error: `Can't transfer a ${ticket.status.toLowerCase()} ticket.` },
      { status: 400 }
    );
  }
  if (ticket.event.startsAt <= new Date()) {
    return NextResponse.json(
      { error: "This event has already started — transfers are closed." },
      { status: 400 }
    );
  }
  if (toEmail === ticket.attendeeEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "That's already the current attendee." },
      { status: 400 }
    );
  }

  // Reassign userId if the target email has an account.
  const toUser = await prisma.user.findUnique({
    where: { email: toEmail },
    select: { id: true }
  });

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        attendeeName: toName,
        attendeeEmail: toEmail,
        userId: toUser?.id ?? null
      }
    });
    await tx.ticketTransfer.create({
      data: {
        ticketId:   ticket.id,
        fromUserId: gate.userId,
        toEmail,
        toName,
        toUserId:   toUser?.id ?? null
      }
    });
  });

  return NextResponse.json({ ok: true, toUserClaimed: !!toUser });
}
