import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guard } from "@/lib/rate-limit";

/**
 * POST /api/likes — toggle a user's like on an event.
 *
 * Body: { eventId: string; action: "like" | "unlike" }
 *
 * Upsert keeps the write idempotent; duplicate "like" calls are no-ops
 * rather than 500s, which matters when a client optimistically toggles
 * and then hits the network twice.
 */
const schema = z.object({
  eventId: z.string().min(1),
  action:  z.enum(["like", "unlike"])
});

export async function POST(req: Request) {
  // Caps spam-tap toggling — legitimate users tap once or twice per
  // event, an automated farmer can hammer thousands per minute.
  const limited = guard(req, "likes", 60, 60_000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { eventId, action } = parsed.data;

  // Confirm the event exists AND is visible (PUBLISHED). A tampered
  // request liking a draft/other-org event should 404 rather than
  // silently succeed.
  const event = await prisma.event.findFirst({
    where:  { id: eventId, status: "PUBLISHED" },
    select: { id: true }
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "like") {
    await prisma.like.upsert({
      where:  { userId_eventId: { userId: gate.userId, eventId } },
      update: {},
      create: { userId: gate.userId, eventId }
    });
  } else {
    await prisma.like.deleteMany({ where: { userId: gate.userId, eventId } });
  }

  return NextResponse.json({ ok: true, action });
}
