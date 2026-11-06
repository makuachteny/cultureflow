import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EventCard from "@/components/EventCard";
import SectionHeader from "@/components/SectionHeader";
import CategoryGlyph from "@/components/CategoryGlyph";
import { CATEGORIES, FEATURED_CITIES, categoryFromSlug } from "@/lib/taxonomy";
import { resolveTheme } from "@/lib/browseThemes";
import { safeJsonLd } from "@/lib/jsonld";
import { WHEN_OPTIONS, WHEN_LABEL, whenRange, type WhenKey } from "@/lib/browseFilters";

export const revalidate = 300;

type Props = {
  params: { category: string };
  searchParams?: { when?: string };
};

/* Quick-filter tabs (mirror /browse + CityEventsSection). */
const WHEN_TABS: Array<{ key: "" | WhenKey; label: string }> = [
  { key: "",          label: "All" },
  { key: "today",     label: "Today" },
  { key: "tomorrow",  label: "Tomorrow" },
  { key: "weekend",   label: "This weekend" },
  { key: "this-week", label: "This week" }
];

// Render on first visit; ISR caches via `revalidate`. Skipping
// `generateStaticParams` avoids a dev-mode Next.js worker issue with
// transitive vendor chunks. Production UX unchanged.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = categoryFromSlug(params.category);
  if (!cat) return { title: "Category not found" };
  return {
    title: `${cat.label} Events — Worldwide`,
    description: `${cat.label}: ${cat.blurb} Find upcoming ${cat.label.toLowerCase()} events for communities around the world.`,
    alternates: { canonical: `/events/category/${cat.slug}` },
    openGraph: {
      title: `${cat.label} events — worldwide`,
      description: cat.blurb,
      type: "website"
    }
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const cat = categoryFromSlug(params.category);
  if (!cat) return notFound();

  // Validated `when` filter — same allow-list as /browse so URLs stay
  // consistent across surfaces. Unknown values collapse to no filter.
  const when: WhenKey = WHEN_OPTIONS.has(searchParams?.when ?? "")
    ? (searchParams!.when as WhenKey)
    : "";
  const range = whenRange(when);

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      endsAt: { gte: new Date() },
      // cat.key is a validated EventCategory literal from our taxonomy.
      category: cat.key,
      ...(range ? { startsAt: { gte: range[0], lt: range[1] } } : {})
    },
    include: { ticketTiers: true },
    orderBy: { startsAt: "asc" },
    take: 60
  });

  /* Liked-state lookup so the heart button on each card matches /browse.
   * Scope the like query to *this page's* event ids so a viewer with
   * thousands of likes doesn't pay to load all of them just to paint
   * the heart on a 60-card grid. */
  const session = await auth();
  const likedSet: Set<string> = session?.user?.id && events.length > 0
    ? new Set(
        (await prisma.like.findMany({
          where: { userId: session.user.id, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true }
        })).map((l) => l.eventId)
      )
    : new Set();

  // Per-category hero photo + accent palette comes from browseThemes,
  // matching the city page treatment one directory up.
  const theme = resolveTheme({ category: cat.slug });
  const heroImage = theme?.image ?? null;

  /* ItemList JSON-LD for search engines — lets Google parse the event
     list on this page and potentially show each as a rich result. */
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const itemListLd = {
    "@context": "https://schema.org",
    "@type":    "ItemList",
    name:       `${cat.label} events`,
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
        <span className="text-ink-700">{cat.label}</span>
      </nav>

      {/* ─── Hero card ─── *
       *  Same oversized destination hero as the city page — full-
       *  width 16/7 photo with a left-side dark scrim that holds the
       *  "Best events for" eyebrow + huge category name + lede + a
       *  category pill (with the line-art glyph). */}
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
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(14,31,74,0.85) 0%, rgba(14,31,74,0.65) 45%, rgba(14,31,74,0.20) 100%)"
          }}
        />

        <div className="relative h-full px-6 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-center max-w-[640px] text-white">
          <div className="text-[14px] sm:text-[15px] font-semibold opacity-90">
            Best events for
          </div>
          <h1 className="mt-1 font-display text-[44px] sm:text-[64px] lg:text-[80px] font-extrabold leading-[0.95] tracking-tight">
            {cat.label}
          </h1>
          <p className="mt-5 max-w-[480px] text-[14px] sm:text-[15px] leading-relaxed text-white/85">
            {cat.blurb}
          </p>
          <div className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-nile px-4 py-2 text-[13px] font-bold">
              <CategoryGlyph slug={cat.slug} size={16} />
              {cat.label}
            </span>
          </div>
        </div>
      </header>

      <section className="mt-14 sm:mt-16">
        <SectionHeader
          eyebrow="What's on"
          title={`Popular ${cat.label.toLowerCase()} events`}
          subtitle={`${events.length} ${when ? WHEN_LABEL[when as Exclude<WhenKey, "">].toLowerCase() : "upcoming"} ${events.length === 1 ? "event" : "events"} from organizers around the world.`}
          action={{
            label: "Refine in Find Events",
            href:  `/browse?category=${encodeURIComponent(cat.key)}`
          }}
        />

        {/* ─── Quick time-filter tabs ─────────────────────────────────
             Same All / Today / Tomorrow / Weekend / Week tabs as /browse
             and CityEventsSection. Re-uses the WHEN_OPTIONS allow-list. */}
        <nav
          aria-label="Filter by time"
          className="mt-5 flex items-center gap-5 sm:gap-7 border-b border-[color:var(--border-hairline)] overflow-x-auto"
        >
          {WHEN_TABS.map((t) => {
            const isActive = t.key === when;
            const href = t.key
              ? `/events/category/${cat.slug}?when=${t.key}`
              : `/events/category/${cat.slug}`;
            return (
              <Link
                key={t.key || "all"}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={
                  "inline-flex items-center px-0.5 pb-2.5 pt-1 text-[14px] font-semibold whitespace-nowrap border-b-2 motion-safe:transition-colors " +
                  (isActive
                    ? "text-nile border-nile"
                    : "text-ink-700 border-transparent hover:text-nile")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {events.length === 0 ? (
          <div className="card p-8 mt-6 text-center">
            <p className="text-ink-700">
              No {when ? WHEN_LABEL[when as Exclude<WhenKey, "">].toLowerCase() : "upcoming"} {cat.label.toLowerCase()} events yet — {when ? "try a different time window or " : ""}be the first to host one.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {when && (
                <Link href={`/events/category/${cat.slug}`} className="btn btn-ghost">
                  Show all
                </Link>
              )}
              <Link href="/events/new" className="btn btn-primary">Host one</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Popular cities</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {FEATURED_CITIES.slice(0, 8).map((c) => (
            <Link key={c.slug} href={`/events/city/${c.slug}`} className="pill-link">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Other categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link key={c.slug} href={`/events/category/${c.slug}`} className="pill-link">
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
