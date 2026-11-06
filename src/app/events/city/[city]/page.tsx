import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EventCard from "@/components/EventCard";
import SectionHeader from "@/components/SectionHeader";
import { CATEGORIES, FEATURED_CITIES, cityFromSlug } from "@/lib/taxonomy";
import { resolveTheme } from "@/lib/browseThemes";
import { safeJsonLd } from "@/lib/jsonld";

export const revalidate = 300;

type Props = { params: { city: string } };

// City pages render on first visit and cache via `revalidate`. We intentionally
// skip `generateStaticParams` to sidestep a Next.js dev-mode worker quirk
// where the static-paths-worker can't resolve certain transitive vendor
// chunks. Production UX is unchanged — ISR still caches the response.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = cityFromSlug(params.city);
  if (!city) return { title: "City not found" };
  const monthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return {
    title: `Events in ${city.label} — ${monthYear}`,
    description: `Browse upcoming South Sudanese events in ${city.label}, ${city.country}. Cultural nights, weddings, faith services, concerts, family gatherings — all in one place.`,
    alternates: { canonical: `/events/city/${city.slug}` },
    openGraph: {
      title: `Events in ${city.label}`,
      description: `What's happening for the South Sudanese community in ${city.label}.`,
      type: "website"
    }
  };
}

export default async function CityPage({ params }: Props) {
  const city = cityFromSlug(params.city);
  if (!city) return notFound();

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      endsAt: { gte: new Date() },
      city: { equals: city.label, mode: "insensitive" }
    },
    include: { ticketTiers: true },
    orderBy: { startsAt: "asc" },
    take: 60
  });

  /* Liked-state lookup so the heart button on each card matches /browse.
   * Same shape as the category page — scoped to this page's events. */
  const session = await auth();
  const likedSet: Set<string> = session?.user?.id && events.length > 0
    ? new Set(
        (await prisma.like.findMany({
          where: { userId: session.user.id, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true }
        })).map((l) => l.eventId)
      )
    : new Set();

  const nearbyCities = FEATURED_CITIES.filter(
    (c) => c.country === city.country && c.slug !== city.slug
  ).slice(0, 5);
  const otherCities = FEATURED_CITIES.filter(
    (c) => c.country !== city.country
  ).slice(0, 6);

  // Pull the per-city theme (hero photo + accent palette) from the same
  // browseThemes config the /browse themed hero uses, so the brand stays
  // consistent across the two entry points.
  const theme = resolveTheme({ city: city.slug });
  const heroImage = theme?.image ?? null;

  /* ItemList JSON-LD — tells search engines this page is a curated
     list of real events in this city, with stable per-item URLs. */
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const itemListLd = {
    "@context": "https://schema.org",
    "@type":    "ItemList",
    name:       `Events in ${city.label}`,
    itemListElement: events.map((e, i) => ({
      "@type":  "ListItem",
      position: i + 1,
      url:      `${baseUrl}/events/${e.slug}`,
      name:     e.title
    }))
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 sm:pb-14 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListLd) }}
      />
      <nav className="text-[13px] text-ink-500">
        <Link href="/browse" className="hover:text-nile">Events</Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-700">Events in {city.label}</span>
      </nav>

      {/* ─── Hero card ─── *
       *  Oversized destination hero. Full-width 16/9 photo with a
       *  left-side dark scrim that holds the eyebrow + huge city name +
       *  lede + a location pill. Generous 12-unit gap below it before
       *  the "Popular in" section so the card doesn't feel pinched. */}
      <header className="mt-8 sm:mt-10 relative overflow-hidden rounded-2xl aspect-[21/8] sm:aspect-[21/7] min-h-[280px] sm:min-h-[360px] bg-nile-900">
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        )}
        {/* Dark scrim — heavier on the left so the copy reads cleanly,
            fades toward transparent on the right so the photo breathes. */}
        <div aria-hidden className="absolute inset-0 bg-nile/90 md:hidden" />
        <div
          aria-hidden
          className="absolute inset-0 hidden md:block"
          style={{ background: "linear-gradient(100deg, #0F47AF 0 54%, #FCDD09 54% 56.5%, transparent 56.5%)" }}
        />

        <div className="relative h-full px-6 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-center max-w-[640px] text-white">
          <div className="text-[14px] sm:text-[15px] font-semibold opacity-90">
            Best events in
          </div>
          <h1 className="mt-1 font-display text-[44px] sm:text-[64px] lg:text-[80px] font-extrabold leading-[0.95] tracking-tight">
            {city.label}
          </h1>
          <p className="mt-5 max-w-[480px] text-[14px] sm:text-[15px] leading-relaxed text-white/85">
            What&rsquo;s happening for the South Sudanese community in {city.label} —
            cultural nights, weddings, faith services, concerts, and tribal gatherings.
          </p>
          <div className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-nile px-4 py-2 text-[13px] font-bold">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {city.label}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Popular in [city] ───
           Generous gap above the section so the hero card finishes
           breathing before the grid starts. */}
      <section className="mt-14 sm:mt-16">
        <SectionHeader
          eyebrow="What's on"
          title={`Popular in ${city.label}`}
          subtitle={`${events.length} upcoming ${events.length === 1 ? "event" : "events"} curated by the tribe.`}
          action={{ label: "Explore more events", href: "/browse" }}
        />
        {events.length === 0 ? (
          <div className="card p-8 mt-4 text-center">
            <p className="text-ink-700">No upcoming events in {city.label} yet — be the first to host one.</p>
            <Link href="/events/new" className="btn btn-primary mt-4">Host an event here</Link>
          </div>
        ) : (
          <div className="mt-2 grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                liked={session?.user?.id ? likedSet.has(e.id) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Browse by category</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CATEGORIES.slice(0, 8).map((c) => (
            <Link key={c.slug} href={`/events/category/${c.slug}`}
              className="card px-3 py-2.5 text-[14px] hover:shadow-card motion-safe:transition-shadow text-nile-900 font-semibold">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {(nearbyCities.length > 0 || otherCities.length > 0) && (
        <section className="mt-14">
          <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Other cities</h2>
          {nearbyCities.length > 0 && (
            <>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Near {city.label}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {nearbyCities.map((c) => (
                  <Link key={c.slug} href={`/events/city/${c.slug}`} className="pill-link">
                    {c.label}
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Global hubs</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {otherCities.map((c) => (
              <Link key={c.slug} href={`/events/city/${c.slug}`} className="pill-link">
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
