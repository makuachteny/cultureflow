import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import EventCard from "@/components/EventCard";
import { safeJsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { userId: string } }
): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where:  { id: params.userId },
    select: {
      name: true, bio: true, city: true, country: true, image: true,
      status: true, role: true
    }
  });
  if (!user || user.status !== "ACTIVE") return { title: "Profile not found" };
  const place = [user.city, user.country].filter(Boolean).join(", ");
  const role  = user.role === "ORGANIZER" || user.role === "ADMIN" ? "Organizer" : "Member";
  const title = `${user.name ?? role}${place ? ` — ${place}` : ""}`;
  const desc  = user.bio ?? `${user.name ?? "Community member"}${place ? ` in ${place}` : ""} on the platform.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/profile/${params.userId}` },
    openGraph: {
      title: user.name ?? role,
      description: desc,
      type:        "profile",
      images: user.image
        ? [{ url: user.image.startsWith("http") ? user.image : user.image }]
        : undefined
    },
    twitter: {
      card: "summary",
      title, description: desc,
      images: user.image ? [user.image] : undefined
    }
  };
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true, name: true, image: true, bio: true, website: true,
        city: true, country: true, tribe: true, role: true, status: true,
        createdAt: true
      }
    }),
    auth()
  ]);
  if (!user || user.status !== "ACTIVE") return notFound();

  const viewerId = session?.user?.id ?? null;
  const isSelf   = viewerId === user.id;

  // Pull everything this profile needs in parallel. Kept granular so a
  // profile with many events doesn't starve the rest of the page while
  // it waits for an expensive join.
  const [
    followerCount, followingCount,
    upcomingEvents, pastEvents, totalEventCount,
    ticketsIssued,
    isFollowing
  ] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId:  user.id } }),
    prisma.event.findMany({
      where: {
        organizerId: user.id,
        status:      "PUBLISHED",
        endsAt:      { gte: new Date() }
      },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 12
    }),
    prisma.event.findMany({
      where: {
        organizerId: user.id,
        status:      "PUBLISHED",
        endsAt:      { lt: new Date() }
      },
      include: { ticketTiers: true },
      orderBy: { startsAt: "desc" },
      take: 8
    }),
    prisma.event.count({
      where: { organizerId: user.id, status: "PUBLISHED" }
    }),
    prisma.ticket.count({
      where: {
        event:  { organizerId: user.id },
        status: { in: ["ISSUED", "CHECKED_IN"] }
      }
    }),
    viewerId && !isSelf
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: viewerId, followingId: user.id }
          }
        }).then(Boolean)
      : Promise.resolve(false)
  ]);

  const place  = [user.city, user.country].filter(Boolean).join(", ");
  const joined = user.createdAt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isOrganizer = user.role === "ORGANIZER" || user.role === "ADMIN";
  const initial = (user.name ?? "?")[0]?.toUpperCase() ?? "?";

  /* Person / Organization structured data — signals who this profile
     page is about to search crawlers. Picks the richer Organization
     shape when the user is an organizer, Person otherwise. */
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const profileLd = isOrganizer
    ? {
        "@context":   "https://schema.org",
        "@type":      "Organization",
        name:         user.name ?? "Community organizer",
        url:          `${baseUrl}/profile/${user.id}`,
        ...(user.image   ? { logo:        user.image.startsWith("http") ? user.image : `${baseUrl}${user.image}` } : {}),
        ...(user.bio     ? { description: user.bio } : {}),
        ...(user.website ? { sameAs:      [user.website] } : {}),
        ...((user.city || user.country)
          ? { address: {
                "@type":         "PostalAddress",
                addressLocality: user.city ?? undefined,
                addressCountry:  user.country ?? undefined
              }
            }
          : {})
      }
    : {
        "@context": "https://schema.org",
        "@type":    "Person",
        name:       user.name ?? "Community member",
        url:        `${baseUrl}/profile/${user.id}`,
        ...(user.image   ? { image:       user.image.startsWith("http") ? user.image : `${baseUrl}${user.image}` } : {}),
        ...(user.bio     ? { description: user.bio } : {}),
        ...((user.city || user.country)
          ? { address: {
                "@type":         "PostalAddress",
                addressLocality: user.city ?? undefined,
                addressCountry:  user.country ?? undefined
              }
            }
          : {})
      };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(profileLd) }}
      />

      {/* ─── Hero ─── */}
      <header className="rounded-2xl border border-[color:var(--border-hairline)] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="shrink-0">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-24 w-24 rounded-full object-cover border border-[color:var(--border-hairline)] sm:h-28 sm:w-28"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-nile text-white text-[32px] font-bold sm:h-28 sm:w-28">
                {initial}
              </div>
            )}
          </div>

          {/* Identity + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
              {isOrganizer ? "Organizer" : "Community member"}
              {user.tribe && (
                <>
                  <span className="text-ink-300" aria-hidden>·</span>
                  <span className="text-ink-600">{user.tribe}</span>
                </>
              )}
            </div>
            <h1 className="mt-1.5 font-display text-[28px] sm:text-[34px] font-extrabold text-nile-900 tracking-tight leading-[1.1]">
              {user.name ?? "Community member"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-600">
              {place && (
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {place}
                </span>
              )}
              <span>Joined {joined}</span>
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-nile hover:underline"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                  </svg>
                  {(() => {
                    try { return new URL(user.website).host.replace(/^www\./, ""); }
                    catch { return "Website"; }
                  })()}
                </a>
              )}
            </div>

            {user.bio && (
              <p className="mt-3 max-w-2xl text-[14.5px] text-ink-700 leading-relaxed whitespace-pre-line">
                {user.bio}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {isSelf ? (
              <Link href="/account/contact-info" className="btn btn-outline btn-sm">
                Edit profile
              </Link>
            ) : viewerId ? (
              <FollowButton organizerId={user.id} initialFollowing={isFollowing} />
            ) : (
              <Link
                href={`/sign-in?callbackUrl=${encodeURIComponent(`/profile/${user.id}`)}`}
                className="btn btn-primary btn-sm"
              >
                Follow
              </Link>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={isOrganizer ? "Events hosted" : "Events"} value={totalEventCount.toLocaleString()} />
          <Stat label="Tickets issued"  value={ticketsIssued.toLocaleString()} />
          <Stat label="Followers"       value={followerCount.toLocaleString()} />
          <Stat label="Following"       value={followingCount.toLocaleString()} />
        </dl>
      </header>

      {/* ─── Upcoming ─── */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] font-bold text-nile-900">Upcoming events</h2>
            <p className="mt-0.5 text-[13px] text-ink-600">
              {upcomingEvents.length > 0
                ? `${upcomingEvents.length} on the calendar`
                : isSelf
                  ? "You haven't scheduled anything yet."
                  : "Nothing scheduled right now."}
            </p>
          </div>
          {isSelf && (
            <Link href="/dashboard/events/new" className="btn btn-gold btn-sm">
              Create event
            </Link>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="rounded-md border border-[color:var(--border-hairline)] bg-white p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-nile-50 text-nile">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </div>
            <p className="text-[14px] text-ink-700">
              {isSelf
                ? "Publish your first event — it takes under five minutes."
                : "This member isn't organizing anything right now. Follow them to hear when that changes."}
            </p>
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      {/* ─── Past ─── */}
      {pastEvents.length > 0 && (
        <section className="mt-14">
          <div className="mb-5">
            <h2 className="font-display text-[22px] font-bold text-nile-900">Past events</h2>
            <p className="mt-0.5 text-[13px] text-ink-600">A recent history — up to the last {pastEvents.length}.</p>
          </div>
          <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pastEvents.map((e) => (
              <div key={e.id} className="opacity-80">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Share + report ─── */}
      <section className="mt-14 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color:var(--border-hairline)] bg-white px-5 py-4">
        <div className="text-[13px] text-ink-600">
          Share this profile so others can follow {user.name?.split(" ")[0] ?? "them"} too.
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${baseUrl}/profile/${user.id}`}
            className="btn btn-ghost btn-sm"
          >
            Copy link
          </Link>
          {!isSelf && (
            <Link
              href={`/contact?topic=TRUST`}
              className="btn btn-ghost btn-sm text-ink-600"
            >
              Report
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--border-hairline)] bg-cream-100/60 px-4 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</dt>
      <dd className="mt-1 font-display text-[22px] font-extrabold text-nile-900 font-tabular">{value}</dd>
    </div>
  );
}
