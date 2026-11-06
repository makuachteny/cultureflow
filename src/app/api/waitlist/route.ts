/**
 * POST /api/waitlist
 *   { eventId: string, email: string, name?: string }
 *
 * Stores a waitlist entry for a sold-out event. Idempotent per (eventId,email)
 * via the unique index on WaitlistEntry. Returns 200 with { position } on
 * success, 400 on bad input, 404 if the event doesn't exist, 409 if already
 * on the list.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  eventId: z.string().min(1),
  email:   z.string().email(),
  name:    z.string().max(120).optional()
});

export async function POST(req: Request) {
  const gate = hit(`waitlist:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many waitlist requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true, status: true }
  });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  try {
    await prisma.waitlistEntry.create({
      data: {
        eventId: parsed.data.eventId,
        email:   parsed.data.email.toLowerCase(),
        name:    parsed.data.name?.trim() || null
      }
    });
  } catch (e: unknown) {
    // Unique constraint violation → already on the list.
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "You're already on the waitlist for this event." },
        { status: 409 }
      );
    }
    throw e;
  }

  const position = await prisma.waitlistEntry.count({
    where: { eventId: parsed.data.eventId }
  });

  return NextResponse.json({ ok: true, position });
}
