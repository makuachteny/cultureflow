import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventCreateSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { hit } from "@/lib/rate-limit";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  // Cap event creation at 20 per hour per user. Prevents a compromised
  // account or buggy script from flooding the catalog. Admins get a
  // higher ceiling since they may seed templated events.
  const limit = gate.role === "ADMIN" ? 100 : 20;
  const bucket = hit(`event-create:${gate.userId}`, limit, 60 * 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "You're creating events too quickly. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  // Promote to organizer if still attendee.
  if (gate.role === "ATTENDEE") {
    await prisma.user.update({ where: { id: gate.userId }, data: { role: "ORGANIZER" } });
  }

  const slug = `${slugify(d.title)}-${randomBytes(3).toString("hex")}`;
  const event = await prisma.event.create({
    data: {
      slug,
      title: d.title,
      summary: d.summary,
      description: d.description,
      category: d.category,
      type: d.type,
      status: d.publish ? "PUBLISHED" : "DRAFT",
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      timezone: d.timezone,
      venueName: d.venueName ?? undefined,
      venueAddress: d.venueAddress ?? undefined,
      city: d.city ?? undefined,
      country: d.country ?? undefined,
      onlineUrl: d.onlineUrl ?? undefined,
      bannerUrl: d.bannerUrl ?? undefined,
      capacity: d.capacity ?? undefined,
      organizerId: gate.userId,
      // Tribe visibility — kept as data so Prisma accepts it once
      // the client is regenerated after the schema migration.
      ...({ tribeVisibility: d.tribeVisibility, visibleTribes: d.visibleTribes } as object),
      ticketTiers: {
        create: d.ticketTiers.map((t) => ({
          name: t.name,
          description: t.description ?? null,
          priceCents: t.priceCents,
          quantity: t.quantity,
          currency: t.currency ?? "USD"
        }))
      }
    }
  });

  return NextResponse.json({ id: event.id, slug: event.slug });
}
