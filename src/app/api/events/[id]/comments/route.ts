import { NextResponse } from "next/server";
import { requireActiveUser, requireCompleteProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { commentSchema } from "@/lib/validators";
import { hit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/events/[id]/comments
 *
 * Attendees, organizers, and admins can all comment, but only on
 * PUBLISHED events — drafts are organizer-private. Rate-limited to
 * 20 comments/hour per IP to throttle spam.
 *
 * Profile must be set up before commenting — anonymous-looking
 * "name: Unknown" comments showing a verified-email warning beside
 * them on the event page were confusing for organizers.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const profileGate = await requireCompleteProfile(gate);
  if (profileGate instanceof NextResponse) return profileGate;

  const bucket = hit(`comment:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many comments. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }

  // Only published events accept public comments. Drafts, cancelled,
  // and past events are excluded — prevents IDOR poking at drafts.
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, status: true }
  });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { eventId: event.id, userId: gate.userId, body: parsed.data.body }
  });
  return NextResponse.json({ id: comment.id });
}
