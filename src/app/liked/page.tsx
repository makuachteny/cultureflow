import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EventCard from "@/components/EventCard";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export const metadata = { title: "Liked" };

/**
 * Liked events — everything the viewer has hearted.
 *
 * Joins the Like row on the Event so the page can render straight
 * EventCards. Past events are hidden (endsAt < now) because a liked
 * event after its date is just clutter; a future pass could surface
 * them in a separate "past" tab.
 */
export default async function LikedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/liked");

  const rows = await prisma.like.findMany({
    where:   { userId: session.user.id, event: { endsAt: { gte: new Date() } } },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        include: { ticketTiers: true }
      }
    }
  });

  const events = rows.map((r) => r.event);

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-8">
        <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold text-nile-900 tracking-tight leading-tight">
          Liked events
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Events you&apos;ve saved for later. {events.length > 0 && (
            <span className="font-semibold text-ink-800">
              {events.length} saved
            </span>
          )}
        </p>
      </header>

      {events.length === 0 ? (
        <EmptyState
          illustration="spark"
          title="Nothing liked yet"
          body="Browse events and tap the heart on any tile to save it here for later."
          primary={{ label: "Browse events", href: "/browse" }}
          secondary={{ label: "See my tickets", href: "/tickets" }}
        />
      ) : (
        <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} liked />
          ))}
        </div>
      )}
    </div>
  );
}
