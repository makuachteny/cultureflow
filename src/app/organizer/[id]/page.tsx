import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import EventCard from "@/components/EventCard";
import { safeJsonLd } from "@/lib/jsonld";
import ShareButton from "./ShareButton";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams?: { tab?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where:  { id: params.id },
    select: { name: true, bio: true, city: true, country: true, image: true, status: true }
  });
  if (!user || user.status !== "ACTIVE") return { title: "Organizer not found" };
  const place = [user.city, user.country].filter(Boolean).join(", ");
  const title = `${user.name ?? "Community organizer"} — events & calendar`;
  const desc  = user.bio ?? `Upcoming events by ${user.name ?? "this organizer"}${place ? ` in ${place}` : ""}.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/organizer/${params.id}` },
    openGraph: {
      title: user.name ?? "Community organizer",
      description: desc,
      type: "profile",
      images: user.image ? [{ url: user.image }] : undefined
    }
  };
}

export default async function OrganizerCalendar({ params, searchParams }: Props) {
  const tab = searchParams?.tab === "past" ? "past" : "upcoming";

  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: params.id },
      select: {
        id: true, name: true, image: true, bio: true, website: true,
        city: true, country: true, role: true, status: true,
        createdAt: true
      }
    }),
    auth()
  ]);
  if (!user || user.status !== "ACTIVE") return notFound();

  const viewerId = session?.user?.id ?? null;
  const isSelf   = viewerId === user.id;

  const now = new Date();

  const [
    followerCount,
    totalEvents,
    totalAttendees,
    firstPublishedEvent,
    upcoming,
    past,
    isFollowing
  ] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.event.count({
      where: { organizerId: user.id, status: "PUBLISHED" }
    }),
    prisma.ticket.count({
      where: {
        event:  { organizerId: user.id },
        status: { in: ["ISSUED", "CHECKED_IN"] }
      }
    }),
    prisma.event.findFirst({
      where:   { organizerId: user.id, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      select:  { createdAt: true }
    }),
    prisma.event.findMany({
      where: {
        organizerId: user.id,
        status:      "PUBLISHED",
        endsAt:      { gte: now }
      },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 24
    }),
    prisma.event.findMany({
      where: {
        organizerId: user.id,
        status:      "PUBLISHED",
        endsAt:      { lt: now }
      },
      include: { ticketTiers: true },
      orderBy: { startsAt: "desc" },
      take: 24
    }),
    viewerId && !isSelf
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: viewerId, followingId: user.id }
          }
        }).then(Boolean)
      : Promise.resolve(false)
  ]);

  const hostingSince = firstPublishedEvent?.createdAt ?? user.createdAt;
  const hostingYears = Math.max(
    1,
    Math.floor((Date.now() - hostingSince.getTime()) / (365 * 24 * 60 * 60 * 1000))
  );
  const hostingLabel = hostingYears === 1 ? "1 year" : `${hostingYears} years`;

  const initial = (user.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const place = [user.city, user.country].filter(Boolean).join(", ");
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  const organizerLd = {
    "@context":   "https://schema.org",
    "@type":      "Organization",
    name:         user.name ?? "Community organizer",
    url:          `${baseUrl}/organizer/${user.id}`,
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
  };

  /* Active tab events. Render empty-state branches per tab so each has
     its own copy; the wrapping grid is shared. */
  const activeEvents = tab === "past" ? past : upcoming;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizerLd) }}
      />

      {/* ─── Hero row: avatar + identity block + action column ─── */}
      <header className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* Big avatar disc — matches the reference's generous scale. */}
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-32 w-32 shrink-0 rounded-full object-cover border border-[color:var(--border-hairline)] sm:h-40 sm:w-40"
            />
          ) : (
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full bg-cream-100 text-ink-900 text-[56px] font-extrabold sm:h-40 sm:w-40 sm:text-[72px]">
              {initial}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-display text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-ink-900 tracking-tight leading-[1.05]">
              {user.name ?? "Community organizer"}
            </h1>

            {/* Stats strip — vertical hairlines between cells, matches
                the reference. `tabular-nums` keeps numbers aligned. */}
            <dl className="mt-5 flex items-stretch divide-x divide-[color:var(--border-hairline)]">
              <StatCell label="hosting"        value={hostingLabel}                    first />
              <StatCell label="total events"   value={totalEvents.toLocaleString()} />
              <StatCell label="total attendees" value={totalAttendees.toLocaleString()} />
            </dl>

            {/* Secondary meta row — place + follower count + website. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-600">
              {place && (
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {place}
                </span>
              )}
              <span>{followerCount.toLocaleString()} {followerCount === 1 ? "follower" : "followers"}</span>
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-nile hover:underline"
                >
                  {(() => {
                    try { return new URL(user.website).host.replace(/^www\./, ""); }
                    catch { return "Website"; }
                  })()}
                </a>
              )}
            </div>

            {user.bio && (
              <p className="mt-4 max-w-2xl text-[14.5px] text-ink-700 leading-relaxed whitespace-pre-line">
                {user.bio}
              </p>
            )}
          </div>
        </div>

        {/* Action column — stacks vertically like the reference. Follow
            is the primary CTA, Contact opens the organizer-routed
            contact form, Share copies a link. */}
        <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:items-end">
          {isSelf ? (
            <Link href="/account/contact-info" className="btn btn-primary btn-lg sm:min-w-[200px]">
              Edit profile
            </Link>
          ) : viewerId ? (
            <FollowButton organizerId={user.id} initialFollowing={isFollowing} />
          ) : (
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(`/organizer/${user.id}`)}`}
              className="btn btn-primary btn-lg sm:min-w-[200px]"
            >
              Follow
            </Link>
          )}

          {/* Direct-to-organizer contact — goes to the dedicated
              /organizer/:id/contact page whose server action persists
              to OrganizerMessage and emails the organizer. Hidden on
              your own profile (you'd just be writing to yourself). */}
          {!isSelf && (
            <Link
              href={`/organizer/${user.id}/contact`}
              className="btn btn-outline btn-lg sm:min-w-[200px]"
            >
              Contact
            </Link>
          )}

          {/* Share — plain link rather than a button so it reads quiet
              next to the two CTAs above. Copies via the user's own
              browser; server never has to know. */}
          <ShareLink
            url={`${baseUrl}/organizer/${user.id}`}
            title={user.name ?? "Community organizer"}
          />
        </div>
      </header>

      {/* ─── Upcoming / Past tab bar ─── */}
      <nav
        aria-label="Event sections"
        className="mt-10 flex items-center gap-7 border-b border-[color:var(--border-hairline)]"
      >
        <TabLink
          href={`/organizer/${user.id}`}
          active={tab === "upcoming"}
          count={upcoming.length}
        >
          Upcoming
        </TabLink>
        <TabLink
          href={`/organizer/${user.id}?tab=past`}
          active={tab === "past"}
          count={past.length}
        >
          Past
        </TabLink>
      </nav>

      {/* ─── Active-tab event grid ─── */}
      <section className="mt-8">
        {activeEvents.length === 0 ? (
          <div className="rounded-md border border-[color:var(--border-hairline)] bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nile-50 text-nile">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </div>
            <p className="text-[14px] text-ink-700">
              {tab === "upcoming"
                ? (isSelf
                    ? "You haven't scheduled anything yet. Create your first event to light this up."
                    : "Nothing scheduled right now — follow to hear when that changes.")
                : "No past events to show."}
            </p>
            {isSelf && tab === "upcoming" && (
              <Link href="/dashboard/events/new" className="btn btn-gold mt-5">
                Create event
              </Link>
            )}
          </div>
        ) : (
          <div
            className={
              "grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3" +
              (tab === "past" ? " opacity-90" : "")
            }
          >
            {activeEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────── helpers ─────────────────── */

function StatCell({
  label, value, first
}: { label: string; value: string; first?: boolean }) {
  return (
    <div className={"min-w-[92px] " + (first ? "pr-6" : "px-6")}>
      <dt className="text-[12px] text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-[18px] font-bold text-ink-900 font-tabular">
        {value}
      </dd>
    </div>
  );
}

function TabLink({
  href, active, count, children
}: {
  href: string; active: boolean; count: number; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "inline-flex items-center gap-1.5 border-b-2 pb-3 pt-1 text-[14.5px] font-semibold transition-colors " +
        (active
          ? "border-nile text-nile"
          : "border-transparent text-ink-700 hover:text-nile")
      }
    >
      {children}
      <span className={"text-[12px] font-semibold " + (active ? "text-nile" : "text-ink-500")}>
        {count}
      </span>
    </Link>
  );
}

function ShareLink({ url, title }: { url: string; title: string }) {
  /* Server component can't run navigator.share, so we drop in a tiny
     client wrapper. Keeping the server-rendered `href` as a fallback
     so the copy-link is progressive: crawlers and no-JS clients still
     see a working anchor to the organizer page. */
  return <ShareButton url={url} title={title} />;
}
