import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import CommentSection from "@/components/CommentSection";
import FollowButton from "@/components/FollowButton";
import EventCard from "@/components/EventCard";
import GoodToKnow from "@/components/event/GoodToKnow";
import LocationBlock from "@/components/event/LocationBlock";
import { brandEmail } from "@/lib/brand";
import TicketPanel from "@/components/event/TicketPanel";
import CheckoutLauncher from "@/components/checkout/CheckoutLauncher";
import EventOverview from "@/components/event/EventOverview";
import EventActions from "@/components/event/EventActions";
import { priceLabel, availabilityStatus } from "@/lib/events";
import { safeJsonLd } from "@/lib/jsonld";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/Icon";
import { detectCurrency } from "@/lib/geo";
import { convert } from "@/lib/fx";
import { money, type Currency } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

async function loadEvent(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: {
        select: { id: true, name: true, image: true, bio: true, city: true, country: true }
      },
      ticketTiers: true,
      comments: {
        where: { status: "VISIBLE" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true, image: true } } }
      },
      _count: { select: { comments: true } }
    }
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await loadEvent(params.slug);
  if (!event || event.status !== "PUBLISHED") return { title: "Event not found" };
  const where = [event.city, event.country].filter(Boolean).join(", ");
  const title = `${event.title}${where ? ` — ${where}` : ""}`;
  const desc  = event.summary.slice(0, 155);
  return {
    title,
    description: desc,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title, description: desc, type: "website",
      images: event.bannerUrl ? [{ url: event.bannerUrl }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title, description: desc,
      images: event.bannerUrl ? [event.bannerUrl] : undefined
    }
  };
}

export default async function EventDetailPage({ params }: Props) {
  const event = await loadEvent(params.slug);
  if (!event || event.status !== "PUBLISHED") return notFound();

  // Fire-and-forget view increment.
  prisma.event
    .update({ where: { id: event.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const [session, followerCount, organizerStats, similar] = await Promise.all([
    auth(),
    prisma.follow.count({ where: { followingId: event.organizer.id } }),
    // Organizer stats row — events count, hosting tenure, total attendees.
    // Counted only from PUBLISHED events so drafts don't inflate numbers.
    (async () => {
      const [eventCount, firstEvent, ticketCount] = await Promise.all([
        prisma.event.count({ where: { organizerId: event.organizer.id, status: "PUBLISHED" } }),
        prisma.event.findFirst({
          where: { organizerId: event.organizer.id, status: "PUBLISHED" },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true }
        }),
        prisma.ticket.count({
          where: {
            event: { organizerId: event.organizer.id },
            status: { in: ["ISSUED", "CHECKED_IN"] }
          }
        })
      ]);
      const years = firstEvent
        ? Math.max(1, Math.floor((Date.now() - firstEvent.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000)))
        : 0;
      return { eventCount, years, ticketCount };
    })(),
    // "More upcoming events from {organizer}" — organizer-scoped rail
    // shown below the Organized-by card (mirrors the reference layout).
    prisma.event.findMany({
      where: {
        id: { not: event.id },
        status: "PUBLISHED",
        endsAt: { gte: new Date() },
        organizerId: event.organizer.id
      },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 6
    })
  ]);

  const viewerId = session?.user?.id ?? null;
  const isOwner = viewerId === event.organizer.id;
  const canEdit = isOwner || session?.user?.role === "ADMIN";
  const isFollowing = viewerId
    ? !!(await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: event.organizer.id
          }
        }
      }))
    : false;

  // Viewer's like-state for this event + the similar-events rail below.
  const likedIds: Set<string> = viewerId
    ? new Set(
        (await prisma.like.findMany({
          where:  { userId: viewerId, eventId: { in: [event.id, ...similar.map((s) => s.id)] } },
          select: { eventId: true }
        })).map((l) => l.eventId)
      )
    : new Set();
  const isLiked = likedIds.has(event.id);

  const totalRemaining = event.ticketTiers.reduce((s, t) => s + Math.max(0, t.quantity - t.sold), 0);
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/events/${event.slug}`;

  /* ────────── JSON-LD for SEO ────────── */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startsAt.toISOString(),
    endDate:   event.endsAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode:
      event.type === "ONLINE"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : event.type === "HYBRID"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    description: event.summary,
    image: event.bannerUrl ? [event.bannerUrl] : undefined,
    location:
      event.type === "ONLINE"
        ? { "@type": "VirtualLocation", url: event.onlineUrl ?? eventUrl }
        : {
            "@type": "Place",
            name: event.venueName ?? event.city ?? "Venue",
            address: [event.venueAddress, event.city, event.country].filter(Boolean).join(", ")
          },
    organizer: {
      "@type": "Organization",
      name: event.organizer.name ?? "Organizer",
      url: `${baseUrl}/organizer/${event.organizer.id}`
    },
    offers: event.ticketTiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: (t.priceCents / 100).toFixed(2),
      priceCurrency: t.currency,
      availability: t.sold < t.quantity
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      url: eventUrl
    }))
  };

  // Date/time formatted to match the reference:
  //   "Tuesday, April 21 · 9 AM - 5 PM"   (no year, minutes dropped when :00)
  const start = event.startsAt;
  const end   = event.endsAt;
  const sameDay = start.toDateString() === end.toDateString();
  const weekday = start.toLocaleString("en-US", { weekday: "long" });
  const shortDate = start.toLocaleString("en-US", { month: "long", day: "numeric" });
  const longDate  = start.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const niceTime = (d: Date) => {
    const opts: Intl.DateTimeFormatOptions =
      d.getMinutes() === 0
        ? { hour: "numeric", hour12: true }
        : { hour: "numeric", minute: "2-digit", hour12: true };
    // Strip the leading space before AM/PM for the compact "9 AM" look.
    return d.toLocaleTimeString("en-US", opts).replace(" ", " ");
  };
  const timeRange = sameDay
    ? `${niceTime(start)} - ${niceTime(end)}`
    : `${formatDate(start)} → ${formatDate(end)}`;
  const availability = availabilityStatus(event.ticketTiers);

  /* ── Local-currency price preview ─────────────────────────────────
   *  Show the buyer the cheapest tier converted into their detected
   *  local currency. Helps a Nairobi visitor see "from KSH 1,500"
   *  rather than "from $12" on a USD-priced event. We compute this
   *  server-side so we never ship FX rates to the client. */
  const buyerCurrency = detectCurrency();
  const tierCurrency  = (event.ticketTiers[0]?.currency ?? "USD") as Currency;
  let localPrice: { fromCents: number; currency: string } | null = null;
  if (event.ticketTiers.length > 0 && buyerCurrency !== tierCurrency) {
    const minCents = Math.min(...event.ticketTiers.map((t) => t.priceCents).filter((c) => c > 0));
    if (Number.isFinite(minCents) && minCents > 0) {
      try {
        const converted = await convert(money(minCents, tierCurrency), buyerCurrency);
        localPrice = { fromCents: converted.amount, currency: converted.currency };
      } catch {
        // FX upstream + fallback both unavailable — silently skip the
        // local-currency hint; checkout will still work.
      }
    }
  }

  return (
    <article className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-28 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* ─── Availability banner ───
          Sits above the hero so scarcity is the first thing a visitor sees
          when tickets are tight. Renders only when the event is actually
          low-stock or nearly sold out — avoids the "always on" false alarm. */}
      {availability && (
        <div
          role="status"
          className={
            "mb-4 flex items-center justify-between gap-4 rounded-md px-4 py-3 shadow-sm " +
            (availability.tone === "hot"
              ? "bg-hibiscus/10 ring-1 ring-hibiscus/30 text-hibiscus"
              : "bg-gold-50 ring-1 ring-gold-100 text-gold-800")
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={"pulse-dot " + (availability.tone === "hot" ? "bg-hibiscus" : "bg-gold")}
              aria-hidden="true"
            />
            <span className="text-[13px] sm:text-[14px] font-bold uppercase tracking-[0.14em] truncate">
              {availability.label}
            </span>
          </div>
          <a
            href="#tickets"
            className="shrink-0 text-[12px] sm:text-[13px] font-semibold underline-offset-2 hover:underline"
          >
            Get tickets →
          </a>
        </div>
      )}

      {/* ─── Hero banner ─── rounded-md for a softer, more editorial
          silhouette. Still 16/7 across all viewports. */}
      <div className="relative aspect-[16/7] rounded-md overflow-hidden bg-nile-50 shadow-sm">
        {event.bannerUrl ? (
          <Image src={event.bannerUrl} alt={event.title} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="bg-event-placeholder absolute inset-0" aria-hidden />
        )}
      </div>

      <div className="mt-10 grid gap-10 xl:gap-14 lg:grid-cols-[minmax(0,1fr),380px]">
        {/* ═══════════════ LEFT COLUMN ═══════════════
            No hairlines between sections — the eye follows whitespace
            alone. Each section's heading reads as a strong nile-900
            display so the rhythm is anchored typographically.
            Parent applies 14-unit (56px) gaps between major blocks. */}
        <div className="min-w-0 space-y-14">
          <header className="space-y-6">
            {/* Title row — title on the left, owner/action buttons on the right */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="font-display text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold text-nile-900 leading-[1.05] tracking-tight min-w-0 flex-1">
                {event.title}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <Link
                    href={`/events/${event.slug}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[13px] font-semibold bg-nile-50 text-nile-700 hover:bg-nile-100 transition-colors"
                    aria-label="Edit this event"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                    Edit
                  </Link>
                )}
                <EventActions
                  eventId={event.id}
                  title={event.title}
                  url={eventUrl}
                  initialLiked={isLiked}
                  flyer={{
                    organizer: event.organizer.name ?? "",
                    bannerUrl: event.bannerUrl,
                    dateLabel: `${shortDate} · ${niceTime(event.startsAt)}`,
                    venueLabel: event.type === "ONLINE"
                      ? "Online event"
                      : [event.venueName, event.city].filter(Boolean).join(", ") || "Venue TBA"
                  }}
                />
              </div>
            </div>

            {/* Organizer row */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-cream-100 px-4 py-3 ring-1 ring-[color:var(--border-hairline)]">
              <div className="flex gap-3 min-w-0 items-center">
                <Link
                  href={`/organizer/${event.organizer.id}`}
                  aria-label={`Visit ${event.organizer.name}'s organizer page`}
                  className="shrink-0"
                >
                  {event.organizer.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.organizer.image}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nile text-white font-bold ring-2 ring-white">
                      {event.organizer.name?.[0] ?? "?"}
                    </span>
                  )}
                </Link>
                <div className="min-w-0">
                  <div className="text-[13px] text-ink-600 font-medium">Hosted by</div>
                  <Link
                    href={`/organizer/${event.organizer.id}`}
                    className="font-bold text-ink-900 text-[15px] hover:underline"
                  >
                    {event.organizer.name}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-ink-500">
                    <InlineStat value={formatCompact(followerCount)} label={pluralize(followerCount, "follower", "followers")} />
                    <InlineStat value={organizerStats.eventCount.toLocaleString()} label={pluralize(organizerStats.eventCount, "event", "events")} />
                    {organizerStats.years > 0 && (
                      <InlineStat value={`${organizerStats.years}y`} label="hosting" />
                    )}
                  </div>
                </div>
              </div>
              {viewerId && !isOwner && (
                <FollowButton organizerId={event.organizer.id} initialFollowing={isFollowing} />
              )}
            </div>

            {/* Details strip — date / location / price side-by-side. Icons
                carry the meaning; we drop the small uppercase label so the
                row reads as a clean tri-column of facts. */}
            <dl className="grid gap-px bg-[color:var(--border-hairline)] rounded-lg overflow-hidden ring-1 ring-[color:var(--border-hairline)] sm:grid-cols-3">
              <DetailCell
                icon="calendar"
                value={`${weekday}, ${shortDate}`}
                sub={timeRange}
              />
              <DetailCell
                icon={event.type === "ONLINE" ? "compass" : "pin"}
                value={
                  event.type === "ONLINE"
                    ? "Online event"
                    : event.venueName || event.city || "Venue TBA"
                }
                sub={
                  event.type === "ONLINE"
                    ? undefined
                    : [event.city, event.country].filter(Boolean).join(", ") || undefined
                }
              />
              <DetailCell
                icon="ticket"
                value={priceLabel(event.ticketTiers)}
                sub={totalRemaining > 0 ? `${totalRemaining} left` : "Sold out"}
              />
            </dl>
          </header>

          {/* ─── Overview ─── */}
          <section>
            <SectionTitle>Overview</SectionTitle>
            <EventOverview summary={event.summary} description={event.description} />
          </section>

          {/* ─── Good to know ─── */}
          <GoodToKnow
            type={event.type}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
            capacity={event.capacity}
            highlights={(event as unknown as { highlights?: string[] }).highlights}
            refundPolicy={(event as unknown as { refundPolicy?: string | null }).refundPolicy}
          />

          {/* ─── Location ─── */}
          <LocationBlock
            venueName={event.venueName}
            venueAddress={event.venueAddress}
            city={event.city}
            country={event.country}
            isOnline={event.type === "ONLINE"}
          />

          {/* ─── Organized by ───
               Flat row on the page background — no card, no cream tint.
               Avatar + name + stats live as a single left-aligned cluster
               so the name sits right next to the avatar, and the
               Contact / Follow buttons drop to the right. */}
          <section>
            <SectionTitle>Organized by</SectionTitle>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <Link
                href={`/organizer/${event.organizer.id}`}
                aria-label={`Visit ${event.organizer.name}'s organizer page`}
                className="flex items-center gap-3.5 min-w-0 group"
              >
                {event.organizer.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizer.image}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-gold-100"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-nile text-white font-bold text-lg shrink-0 ring-2 ring-gold-100">
                    {event.organizer.name?.[0] ?? "?"}
                  </span>
                )}
                <span className="font-display text-[17px] font-bold text-nile-900 truncate group-hover:underline">
                  {event.organizer.name}
                </span>
              </Link>

              {/* Stats — same line as the name on wide viewports, wrap
                  beneath on narrow. */}
              <dl className="flex items-center gap-x-5 gap-y-2 text-[13px]">
                <Stat label="Followers" value={followerCount.toLocaleString()} />
                <span aria-hidden className="h-7 w-px bg-ink-400/30" />
                <Stat label="Events"    value={organizerStats.eventCount.toLocaleString()} />
                {organizerStats.years > 0 && (
                  <>
                    <span aria-hidden className="h-7 w-px bg-ink-400/30" />
                    <Stat label="Hosting" value={`${organizerStats.years}y`} />
                  </>
                )}
              </dl>

              {/* Buttons — `ml-auto` pushes them right on wide screens,
                  flex-wrap drops them to their own row on narrow. */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <a
                  href={`mailto:${brandEmail("support")}?subject=${encodeURIComponent(`Question about ${event.title}`)}&body=${encodeURIComponent(`Hi — I have a question about "${event.title}" (${eventUrl}).`)}`}
                  className="btn btn-outline btn-sm"
                >
                  Contact
                </a>
                {viewerId && !isOwner && (
                  <FollowButton
                    organizerId={event.organizer.id}
                    initialFollowing={isFollowing}
                  />
                )}
              </div>
            </div>

            {/* Optional bio paragraph below the card. */}
            {event.organizer.bio && (
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-700 whitespace-pre-line">
                {event.organizer.bio}
              </p>
            )}

            {/* Report link — mailto for now; promote to a moderation API
                when we wire up an admin queue. */}
            <div className="mt-6 flex justify-center">
              <a
                href={`mailto:${brandEmail("abuse")}?subject=${encodeURIComponent(`Report: ${event.title}`)}&body=${encodeURIComponent(`Reporting this event: ${eventUrl}\n\nReason:\n`)}`}
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-nile hover:text-nile-700 motion-safe:transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Report this event
              </a>
            </div>
          </section>

          {/* ─── Comments ─── */}
          <CommentSection
            eventId={event.id}
            comments={event.comments as never}
            canComment={!!viewerId}
          />
        </div>

        {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
        <aside className="hidden lg:block lg:sticky lg:top-24 self-start">
          <TicketPanel
            eventId={event.id}
            slug={event.slug}
            tiers={event.ticketTiers}
            signedIn={!!viewerId}
            startsAtLabel={`${weekday}, ${longDate}`}
            localPrice={localPrice}
          />
        </aside>

        {/* Mobile — same panel inline */}
        <div className="lg:hidden">
          <TicketPanel
            id="tickets"
            eventId={event.id}
            slug={event.slug}
            tiers={event.ticketTiers}
            signedIn={!!viewerId}
            startsAtLabel={`${weekday}, ${longDate}`}
            localPrice={localPrice}
          />
        </div>
      </div>

      {/* ─── More upcoming events from the same organizer ─── */}
      {similar.length > 0 && (
        <section className="mt-20">
          <SectionTitle>More upcoming events from {event.organizer.name}</SectionTitle>
          <p className="mt-2 text-[14px] text-ink-600 max-w-xl">
            Discover more upcoming events from {event.organizer.name}
            {event.category ? `, from ${event.category.charAt(0) + event.category.slice(1).toLowerCase()}` : ""} to other experiences you might love.
          </p>
          <div className="mt-6 grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {similar.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                liked={viewerId ? likedIds.has(e.id) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* See helpers below for page-local utilities. */}

      {/* ─── Checkout popup ───
           Mounted at the page root so the modal floats over everything
           when ?checkout=1 is set. Tier data is the same payload the
           ticket panel sees, plus the event metadata needed for the
           order-summary sidebar. */}
      <CheckoutLauncher
        signedIn={!!viewerId}
        event={{
          id:                     event.id,
          slug:                   event.slug,
          title:                  event.title,
          bannerUrl:              event.bannerUrl,
          startsAt:               event.startsAt.toISOString(),
          endsAt:                 event.endsAt.toISOString(),
          organizerId:            event.organizer.id,
          organizerName:          event.organizer.name ?? null,
          organizerImage:         event.organizer.image ?? null,
          organizerFollowerCount: followerCount,
          venueName:              event.venueName,
          city:                   event.city,
          country:                event.country,
          type:                   event.type,
          refundPolicy:           event.refundPolicy ?? null
        }}
        tiers={event.ticketTiers.map((t) => ({
          id:         t.id,
          name:       t.name,
          priceCents: t.priceCents,
          currency:   t.currency,
          remaining:  Math.max(0, t.quantity - t.sold)
        }))}
        isFollowingOrganizer={isFollowing}
        similarEvents={similar.map((s) => ({
          id:            s.id,
          slug:          s.slug,
          title:         s.title,
          bannerUrl:     s.bannerUrl,
          startsAt:      s.startsAt.toISOString(),
          priceLabel:    priceLabel(s.ticketTiers),
          city:          s.city,
          organizerName: event.organizer.name ?? null
        }))}
        defaultEmail={session?.user?.email ?? ""}
        defaultName={session?.user?.name ?? ""}
      />

      {/* ─── Mobile sticky CTA ───
           Single row, no wrap — truncate the price line if it gets long.
           Shares the price-label helper with the cards so copy stays
           in sync. */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white shadow-[0_-3px_0_0_#000] px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink truncate">
            {priceLabel(event.ticketTiers)}
          </div>
          <div className="text-[11px] text-ink-500 truncate">
            {totalRemaining > 0 ? `${totalRemaining} left` : "Sold out"}
          </div>
        </div>
        <a href="#tickets" className="btn btn-primary shrink-0 whitespace-nowrap">
          {totalRemaining > 0
            ? (event.ticketTiers.every((t) => t.priceCents === 0) ? "Reserve" : "Get tickets")
            : "Join waitlist"}
        </a>
      </div>
    </article>
  );
}

/** Section heading used for every major section on the event page.
 *  Strong display weight + nile-900 anchors the rhythm typographically
 *  without needing hairline dividers between sections. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-nile-900 tracking-tight">
      {children}
    </h2>
  );
}

/** Labelled stat cell used inside the "Organized by" card.
 *  Small uppercase label on top, strong number below. Matches the
 *  reference layout where stats stack vertically between vertical rules. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-[15px] font-bold text-nile-900 font-tabular">
        {value}
      </dd>
    </div>
  );
}

/** "6543 → 6.5k", "39800 → 39.8k", "420 → 420". Mirrors the reference
 *  organizer-stats formatting (compact + one decimal for the k/M range). */
function formatCompact(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
  }
  const m = n / 1_000_000;
  return `${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
}

/** "1 follower" / "2 followers". Pluralizes by 1-vs-other so the header
 *  never reads "1 followers" or "1 events". */
function pluralize(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}

/** Inline organizer-stat fragment: bold value + label, with a bullet
 *  separator inserted before all but the first sibling. The bullet is
 *  rendered as a quiet `·` so the whole row reads as one line of running
 *  text under the organizer name. */
function InlineStat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline [&:not(:first-child)]:before:content-['·'] [&:not(:first-child)]:before:mx-2 [&:not(:first-child)]:before:text-ink-400">
      <span className="font-bold font-tabular text-ink-700">{value}</span>{" "}
      <span>{label}</span>
    </span>
  );
}

/**
 * Cell inside the 3-up details strip on the event header.
 * Icon + value + optional sub-line. The uppercase label is intentionally
 * dropped — the icon carries the meaning, and the row reads as a clean
 * tri-column of facts (date / location / price) without the chrome.
 */
function DetailCell({
  icon,
  value,
  sub
}: {
  icon: "pin" | "compass" | "calendar" | "ticket";
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-white p-4 sm:p-5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700"
        aria-hidden="true"
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className="font-display text-[15px] sm:text-[16px] font-bold text-nile-900 leading-tight truncate">
          {value}
        </div>
        {sub && (
          <div className="mt-0.5 text-[12px] text-ink-600 truncate">{sub}</div>
        )}
      </div>
    </div>
  );
}
