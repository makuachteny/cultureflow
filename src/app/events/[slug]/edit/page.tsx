import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EventForm, { type EventFormInitial } from "@/components/EventForm";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export default async function EditEventPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/events/${params.slug}/edit`);
  }

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      ticketTiers: { orderBy: { priceCents: "asc" } }
    }
  });
  if (!event) return notFound();

  const isOwner = event.organizerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return notFound();
  }

  const initial: EventFormInitial = {
    title:        event.title,
    summary:      event.summary,
    description:  event.description,
    category:     event.category,
    type:         event.type,
    startsAt:     event.startsAt,
    endsAt:       event.endsAt,
    timezone:     event.timezone,
    venueName:    event.venueName,
    venueAddress: event.venueAddress,
    city:         event.city,
    country:      event.country,
    onlineUrl:    event.onlineUrl,
    bannerUrl:    event.bannerUrl,
    capacity:     event.capacity,
    tribeVisibility: (event as unknown as { tribeVisibility?: EventFormInitial["tribeVisibility"] }).tribeVisibility ?? "EVERYONE",
    visibleTribes:   (event as unknown as { visibleTribes?: string[] }).visibleTribes ?? [],
    status:       event.status,
    tiers: event.ticketTiers.map((t) => ({
      id: t.id,
      name: t.name,
      priceCents: t.priceCents,
      quantity: t.quantity,
      sold: t.sold
    }))
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-10 sm:pb-14 lg:pb-16">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
        Edit event
      </div>
      <h1 className="mt-2 font-display text-[32px] sm:text-[40px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
        {event.title}
      </h1>
      <p className="mt-2 text-[15px] text-ink-600 leading-relaxed">
        Changes go live as soon as you save.{" "}
        <Link
          href={`/events/${event.slug}`}
          className="text-nile font-semibold hover:underline"
        >
          View event
        </Link>
      </p>

      <EventForm eventId={event.id} initial={initial} />
    </div>
  );
}
