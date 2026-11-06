import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/tickets/[id]/refund-request
 *
 * Attendee asks the organizer for a refund. We don't move money — just
 * create a RefundRequest record in PENDING state. The organizer resolves
 * it from their dashboard (that UI is a follow-up; for now the record
 * is visible to admins and the attendee).
 *
 * Preconditions:
 *   • authenticated
 *   • ticket belongs to the authenticated user
 *   • ticket is ISSUED (not CHECKED_IN, CANCELLED, or already REFUNDED)
 *   • no existing RefundRequest for this ticket
 */

const schema = z.object({
  reason: z.string().trim().min(4, "Tell the organizer why").max(2000)
});

// 20 requests per hour per IP — abuse ceiling, not a UX one.
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`refund:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many refund requests. Try again later." },
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

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { refundRequest: true }
  });
  if (!ticket || ticket.userId !== gate.userId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status !== "ISSUED") {
    return NextResponse.json(
      { error: `Can't request a refund on a ${ticket.status.toLowerCase()} ticket.` },
      { status: 400 }
    );
  }
  if (ticket.refundRequest) {
    return NextResponse.json(
      { error: "A refund request already exists for this ticket." },
      { status: 409 }
    );
  }

  const created = await prisma.refundRequest.create({
    data: {
      ticketId: ticket.id,
      userId: gate.userId,
      reason: parsed.data.reason
    }
  });

  return NextResponse.json({ id: created.id, status: created.status });
}
