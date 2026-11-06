import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventUpdateSchema } from "@/lib/validators";
import { hit } from "@/lib/rate-limit";

/**
 * PATCH /api/events/[id]
 *
 * Organizers can edit their own events; admins can edit any. Ticket tiers
 * are reconciled: items with an id are updated, items without an id are
 * created, and existing tiers that disappear from the payload are deleted.
 * Tiers with sold > 0 are protected — they can't be deleted, nor can their
 * `quantity` drop below what's already been sold.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`event-update:${gate.userId}`, 60, 60 * 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many edits. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, organizerId: true, slug: true, status: true }
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = event.organizerId === gate.userId;
  const isAdmin = gate.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = eventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  const existingTiers = await prisma.ticketTier.findMany({
    where: { eventId: event.id },
    select: { id: true, name: true, sold: true }
  });
  const existingById = new Map(existingTiers.map((t) => [t.id, t]));

  // Quantity can't drop below what's already sold.
  for (const t of d.ticketTiers) {
    if (!t.id) continue;
    const prior = existingById.get(t.id);
    if (prior && t.quantity < prior.sold) {
      return NextResponse.json(
        { error: `"${t.name}" already has ${prior.sold} tickets sold — quantity can't go below that.` },
        { status: 400 }
      );
    }
  }

  // Tiers to delete = existing ids not present in the incoming payload.
  const incomingIds = new Set(d.ticketTiers.map((t) => t.id).filter(Boolean) as string[]);
  const toDelete = existingTiers.filter((t) => !incomingIds.has(t.id));
  const blocked = toDelete.find((t) => t.sold > 0);
  if (blocked) {
    return NextResponse.json(
      { error: `Can't remove "${blocked.name}" — ${blocked.sold} ticket(s) already sold.` },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Event fields
    await tx.event.update({
      where: { id: event.id },
      data: {
        title: d.title,
        summary: d.summary,
        description: d.description,
        category: d.category,
        type: d.type,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        timezone: d.timezone,
        venueName: d.venueName ?? null,
        venueAddress: d.venueAddress ?? null,
        city: d.city ?? null,
        country: d.country ?? null,
        onlineUrl: d.onlineUrl ?? null,
        bannerUrl: d.bannerUrl ?? null,
        capacity: d.capacity ?? null,
        ...(d.publish !== undefined
          ? { status: d.publish ? "PUBLISHED" : "DRAFT" }
          : {}),
        ...({ tribeVisibility: d.tribeVisibility, visibleTribes: d.visibleTribes } as object)
      }
    });

    // Tier sync
    if (toDelete.length > 0) {
      await tx.ticketTier.deleteMany({
        where: { id: { in: toDelete.map((t) => t.id) } }
      });
    }
    for (const t of d.ticketTiers) {
      if (t.id && existingById.has(t.id)) {
        await tx.ticketTier.update({
          where: { id: t.id },
          data: {
            name: t.name,
            description: t.description ?? null,
            priceCents: t.priceCents,
            quantity: t.quantity,
            currency: t.currency
          }
        });
      } else {
        await tx.ticketTier.create({
          data: {
            eventId: event.id,
            name: t.name,
            description: t.description ?? null,
            priceCents: t.priceCents,
            quantity: t.quantity,
            currency: t.currency
          }
        });
      }
    }

    return tx.event.findUnique({
      where: { id: event.id },
      select: { id: true, slug: true }
    });
  });

  return NextResponse.json({ id: updated?.id, slug: updated?.slug });
}

/**
 * DELETE /api/events/[id]
 *
 * Organizers can delete their own events; admins can delete any. Events
 * with at least one PAID order are rejected — deleting would wipe
 * revenue records and leave ticket holders with invalid tickets. The
 * organizer must cancel via the dashboard instead.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, organizerId: true }
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = event.organizerId === gate.userId;
  const isAdmin = gate.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const paidCount = await prisma.order.count({
    where: { eventId: event.id, status: "PAID" }
  });
  if (paidCount > 0) {
    return NextResponse.json(
      {
        error:
          "This event has paid orders and can't be deleted. Cancel the event to refund attendees instead."
      },
      { status: 409 }
    );
  }

  await prisma.event.delete({ where: { id: event.id } });
  return NextResponse.json({ ok: true });
}
