/**
 * Promo-code CRUD for organizers.
 *
 *   GET  /api/promo-codes                 — list codes the caller owns
 *   POST /api/promo-codes                 — create a new code
 *   POST /api/promo-codes  { id, ... }    — update an existing code
 *   POST /api/promo-codes  { id, delete } — delete (soft via active flag)
 *
 * A code is "owned" by an organizer when its `eventId` belongs to the
 * caller, OR (for global codes) the caller is ADMIN.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/auth";

const createSchema = z.object({
  code:          z.string().trim().min(2).max(40)
                  .regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, dashes only"),
  description:   z.string().trim().max(160).optional(),
  discountType:  z.enum(["PERCENT", "FIXED_CENTS"]),
  discountValue: z.coerce.number().int().min(1).max(100_000_00),
  eventId:       z.string().min(1).optional(),
  startsAt:      z.coerce.date().optional(),
  endsAt:        z.coerce.date().optional(),
  maxUses:       z.coerce.number().int().min(1).max(1_000_000).optional(),
  maxPerUser:    z.coerce.number().int().min(1).max(100).optional(),
  active:        z.coerce.boolean().optional()
});

const updateSchema = createSchema.partial().extend({
  id:     z.string().min(1),
  delete: z.literal(true).optional()
});

export async function GET() {
  const gate = await requireOrganizer();
  if (gate instanceof NextResponse) return gate;
  const codes = await prisma.promoCode.findMany({
    where: gate.role === "ADMIN"
      ? {}
      : { OR: [{ event: { organizerId: gate.userId } }, { eventId: null }] },
    orderBy: { createdAt: "desc" },
    include: { event: { select: { id: true, title: true, organizerId: true } } }
  });
  return NextResponse.json({ codes });
}

export async function POST(req: Request) {
  // Organizer endpoint; cap scripted abuse.
  const limited = guard(req, "promo-codes", 60, 60000);
  if (limited) return limited;

  const gate = await requireOrganizer();
  if (gate instanceof NextResponse) return gate;
  const body = await req.json().catch(() => null);

  // Update / delete branch.
  if (body && typeof body === "object" && "id" in body) {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const existing = await prisma.promoCode.findUnique({
      where: { id: parsed.data.id },
      include: { event: { select: { organizerId: true } } }
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ownsIt =
      gate.role === "ADMIN" ||
      (existing.event && existing.event.organizerId === gate.userId);
    if (!ownsIt) return NextResponse.json({ error: "Not yours" }, { status: 403 });

    if (parsed.data.delete) {
      await prisma.promoCode.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, deleted: true });
    }
    const { id: _id, delete: _del, ...patch } = parsed.data;
    void _id; void _del;
    const code = await prisma.promoCode.update({
      where: { id: existing.id },
      data:  patch.code ? { ...patch, code: patch.code.toUpperCase() } : patch
    });
    return NextResponse.json({ code });
  }

  // Create branch.
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  // Scope check: organizers can only attach codes to events they own.
  if (parsed.data.eventId && gate.role !== "ADMIN") {
    const ev = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
    if (!ev || ev.organizerId !== gate.userId) {
      return NextResponse.json({ error: "Event not yours" }, { status: 403 });
    }
  }
  // Duplicate code check.
  const upperCode = parsed.data.code.toUpperCase();
  const dupe = await prisma.promoCode.findUnique({ where: { code: upperCode } });
  if (dupe) return NextResponse.json({ error: "That code is taken" }, { status: 409 });

  const created = await prisma.promoCode.create({
    data: {
      ...parsed.data,
      code:   upperCode,
      active: parsed.data.active ?? true
    }
  });
  return NextResponse.json({ code: created }, { status: 201 });
}
