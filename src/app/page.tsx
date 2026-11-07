import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EventCard from "@/components/EventCard";
import EmptyState from "@/components/EmptyState";
import SectionHeader from "@/components/SectionHeader";
import HomeHero from "@/components/home/HomeHero";
import CategoryCircles from "@/components/home/CategoryCircles";
import CityEventsSection from "@/components/home/CityEventsSection";
import { FEATURED_CITIES } from "@/lib/taxonomy";
import { defaultCityForRequest } from "@/lib/geo";
import { BRAND_NAME } from "@/lib/brand";

// Home changes per visit (signed-in/out, interests, city) so cache short.
export const dynamic = "force-dynamic";

const WHENS = ["all", "for-you", "today", "weekend"] as const;
type When = (typeof WHENS)[number];

type SP = { city?: string; when?: string };

export default async function HomePage({ searchParams }: { searchParams?: SP }) {
  const citiesForPicker = FEATURED_CITIES.map((c) => c.label);

  /* ────────── Who's looking? ────────── */
  const session = await auth();
  const viewer = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        // Include onboardedAt + interests — we need them for the onboarding
        // gate below and for the "For you" feed. Without these, the cast
        // used to trick TypeScript but the runtime value was always undefined,
        // causing every signed-in user to bounce back to /welcome.
        select: {
          id: true, name: true, image: true, city: true,
          onboardedAt: true, interests: true
        }
      })
    : null;

  // New users (no onboardedAt stamp yet) get redirected to the wizard.
  if (session?.user?.id && viewer && !viewer.onboardedAt) {
    redirect("/welcome");
  }

  const viewerCity = viewer?.city || null;
  const viewerInterests = viewer?.interests ?? [];

  const selectedCity =
    searchParams?.city ?? viewerCity ?? defaultCityForRequest();
  const selectedWhen: When = WHENS.includes((searchParams?.when ?? "all") as When)
    ? (searchParams?.when as When)
    : "all";

  /* ────────── Load shared + personalized events ──────────
   *
   * Defaults are scoped to the viewer's area (`selectedCity`) so the
   * first cards a person sees are events near them — exactly what the
   * "browsing events in <city>" copy on the section below promises.
   * The viewer can change cities via the LocationPicker in
   * CityEventsSection, or hit the city chips further down.
   *
   * If the city has too few events for a section to look populated, we
   * top up with global results so the page never reads empty. The
   * city-first results stay first in the array (already ordered by
   * startsAt asc), and global results fill the tail.
   */
  type Cat = NonNullable<Prisma.EventWhereInput["category"]>;
  const interestIn = { in: viewerInterests } as Cat;
  const cityWhere: Prisma.EventWhereInput = {
    city: { equals: selectedCity, mode: "insensitive" }
  };

  // Country for the selected city — drives the "Across <country>"
  // section below, which surfaces neighbouring-city events from the
  // same country (excluding the city the viewer is already browsing).
  const cityMeta = FEATURED_CITIES.find(
    (c) => c.label.toLowerCase() === selectedCity.toLowerCase()
  );
  const selectedCountry = cityMeta?.country ?? null;
  const countryWhere: Prisma.EventWhereInput | null = selectedCountry
    ? {
        country: { equals: selectedCountry, mode: "insensitive" },
        NOT: { city: { equals: selectedCity, mode: "insensitive" } }
      }
    : null;

  const [
    featuredCity, featuredGlobal,
    upcomingCity, upcomingGlobal,
    countryEvents,
    forYou,
    myUpcomingTicketCount, myDraftCount
  ] = await Promise.all([
    // Featured in the viewer's area.
    prisma.event.findMany({
      where: { status: "PUBLISHED", featured: true, endsAt: { gte: new Date() }, ...cityWhere },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    // Global featured — fallback when the area is sparse.
    prisma.event.findMany({
      where: { status: "PUBLISHED", featured: true, endsAt: { gte: new Date() } },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    // Upcoming in the viewer's area.
    prisma.event.findMany({
      where: { status: "PUBLISHED", endsAt: { gte: new Date() }, ...cityWhere },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 8
    }),
    // Global upcoming — fallback when the area is sparse.
    prisma.event.findMany({
      where: { status: "PUBLISHED", endsAt: { gte: new Date() } },
      include: { ticketTiers: true },
      orderBy: { startsAt: "asc" },
      take: 8
    }),
    // Country-scoped — events in other cities of the same country as
    // the viewer's selected city. Powers the "Across <country>" rail.
    countryWhere
      ? prisma.event.findMany({
          where: { status: "PUBLISHED", endsAt: { gte: new Date() }, ...countryWhere },
          include: { ticketTiers: true },
          orderBy: { startsAt: "asc" },
          take: 8
        })
      : Promise.resolve([] as never[]),
    // Personalized feed — only meaningful when we have interests to filter on.
    // Also area-scoped first; the wizard collected city + interests so this
    // is the strongest signal we have for "what they'll click".
    viewer && viewerInterests.length > 0
      ? prisma.event.findMany({
          where: {
            status: "PUBLISHED",
            endsAt: { gte: new Date() },
            category: interestIn,
            ...cityWhere
          },
          include: { ticketTiers: true },
          orderBy: { startsAt: "asc" },
          take: 6
        })
      : Promise.resolve([] as never[]),
    // Dashboard-y counts for the signed-in welcome strip — these distinguish
    // the banner from the header's plain nav links.
    viewer
      ? prisma.ticket.count({
          where: {
            userId: viewer.id,
            status: { in: ["ISSUED", "CHECKED_IN"] },
            event: { endsAt: { gte: new Date() } }
          }
        })
      : Promise.resolve(0),
    viewer
      ? prisma.event.count({
          where: { organizerId: viewer.id, status: "DRAFT" }
        })
      : Promise.resolve(0)
  ]);

  /* ────────── Merge city-first + global fallback ──────────
   *
   * The display rule: keep the city-scoped events first, then top up with
   * global results so a sparse city never leaves a section blank. Each
   * fallback strips out duplicates (events already shown in the city
   * batch) before joining.
   */
  const mergeUnique = <T extends { id: string }>(primary: T[], fallback: T[], cap: number): T[] => {
    const ids = new Set(primary.map((e) => e.id));
    const tail = fallback.filter((e) => !ids.has(e.id));
    return [...primary, ...tail].slice(0, cap);
  };
  const FEATURED_TARGET = 4;
  const UPCOMING_TARGET = 8;
  const featured = featuredCity.length >= FEATURED_TARGET ? featuredCity : mergeUnique(featuredCity, featuredGlobal, FEATURED_TARGET);
  const upcoming = upcomingCity.length >= UPCOMING_TARGET ? upcomingCity : mergeUnique(upcomingCity, upcomingGlobal, UPCOMING_TARGET);
  const featuredFromCity = featuredCity.length >= FEATURED_TARGET;
  const upcomingFromCity = upcomingCity.length >= UPCOMING_TARGET;

  return (
    <>
      {/* ───────── Welcome row — both auth states ─────────
           Same greeting copy on both views — the right-side chrome is
           what differentiates signed-in (personalized action cards w/
           counts) from signed-out (sign-in / join CTAs). */}
      <section className="bg-white border-b-2 border-ink w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-6 sm:pb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          {/* Greeting — no logo disc; just eyebrow + headline */}
          <div className="min-w-0">
            <h2 className="font-display text-[24px] sm:text-[30px] font-black text-ink leading-[1.05]">
              Find your next gathering
            </h2>
          </div>

          {/* Right side — auth-gated content. Signed-in users see action
              affordances for "My tickets" and "Create event"; guests see
              the newsletter subscribe pill.

              Layout splits at sm:
                • Below sm (mobile): two compact 44 × 44 icon buttons —
                  saves horizontal real estate next to the welcome copy
                  so the row never wraps to two lines.
                • sm:+ (desktop): full text buttons with labels — the
                  original card-style affordances. Notification badges
                  sit at the top-right of each button. */}
          {viewer ? (
            <>
              {/* Mobile — icon buttons. */}
              <div className="flex sm:hidden items-center gap-2.5">
                <Link
                  href="/tickets"
                  aria-label={`My tickets (${myUpcomingTicketCount} upcoming)`}
                  title={`My tickets — ${myUpcomingTicketCount} upcoming`}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink-900 ring-1 ring-ink-900/10 shadow-sm hover:bg-cream-100 hover:ring-[color:var(--border-strong)] motion-safe:transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" />
                    <path d="M9 6v12" strokeDasharray="2 3" />
                  </svg>
                  {myUpcomingTicketCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-nile px-1 text-[10.5px] font-bold text-white ring-2 ring-cream-100 font-tabular"
                    >
                      {myUpcomingTicketCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/events/new"
                  aria-label={myDraftCount > 0 ? `Create event (${myDraftCount} drafts)` : "Create event"}
                  title={myDraftCount > 0 ? `Create event — ${myDraftCount} drafts` : "Create event — publish in 5 min"}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-nile-900 text-white shadow-sm hover:bg-nile-800 motion-safe:transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {myDraftCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10.5px] font-bold text-nile-900 ring-2 ring-cream-100 font-tabular"
                    >
                      {myDraftCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Desktop — full text buttons. */}
              <div className="hidden sm:flex items-center gap-2.5">
                {/* My tickets — quiet white pill with ticket icon + label
                    + count badge. */}
                <Link
                  href="/tickets"
                  aria-label={`My tickets (${myUpcomingTicketCount} upcoming)`}
                  className="relative inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white text-ink-900 ring-1 ring-ink-900/10 shadow-sm hover:bg-cream-100 hover:ring-[color:var(--border-strong)] motion-safe:transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" />
                    <path d="M9 6v12" strokeDasharray="2 3" />
                  </svg>
                  <span className="text-[14px] font-semibold whitespace-nowrap">My tickets</span>
                  {myUpcomingTicketCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-nile px-1 text-[10.5px] font-bold text-white ring-2 ring-cream-100 font-tabular"
                    >
                      {myUpcomingTicketCount}
                    </span>
                  )}
                </Link>

                {/* Create event — primary nile tile so the eye lands here. */}
                <Link
                  href="/events/new"
                  aria-label={myDraftCount > 0 ? `Create event (${myDraftCount} drafts)` : "Create event"}
                  className="relative inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-nile-900 text-white shadow-sm hover:bg-nile-800 motion-safe:transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[14px] font-semibold whitespace-nowrap">Create event</span>
                  {myDraftCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10.5px] font-bold text-nile-900 ring-2 ring-cream-100 font-tabular"
                    >
                      {myDraftCount}
                    </span>
                  )}
                </Link>
              </div>
            </>
          ) : (
            // Newsletter subscribe — inline email input + button. POSTs
            // to /api/subscribe (which 303-redirects to /?subscribed=1
            // on success) so the form works without JS. The input pill
            // and the button share the same height so the row reads as
            // one composed control, not a form field next to a button.
            // Subscribe form. The input + button live inside one rounded
            // container that reads as a single composed pill (envelope
            // icon + email field + Subscribe button). Tighter sizing
            // (220 px on sm:+) so a short placeholder like
            // "you@example.com" doesn't swim in empty whitespace. Ring
            // width stays steady on focus so the silhouette never shifts.
            <form
              action="/api/subscribe"
              method="post"
              className={
                "flex w-full sm:w-auto items-center h-11 bg-white pl-4 pr-1 " +
                "border-2 border-ink focus-within:shadow-[4px_4px_0_0_#0F47AF] " +
                "transition-shadow duration-150"
              }
            >
              <label htmlFor="hp-subscribe-email" className="sr-only">
                Email address
              </label>
              {/* Envelope glyph — quiet ink-500, gives the placeholder
                  visual support so a short address looks anchored. */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-ink-500 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="M3.5 7l8.5 6 8.5-6" />
              </svg>
              <input
                id="hp-subscribe-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={
                  "flex-1 sm:flex-none sm:w-[220px] min-w-0 h-full bg-transparent " +
                  "text-[14px] text-ink-900 placeholder:text-ink-500 " +
                  "appearance-none border-0 outline-none ring-0 shadow-none " +
                  "focus:outline-none focus:ring-0"
                }
              />
              <button
                type="submit"
                className="inline-flex items-center h-[34px] px-4 ml-1 bg-hibiscus text-white text-[13.5px] font-bold hover:bg-ink transition-colors whitespace-nowrap shrink-0"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ───────── HERO ───────── */}
      <HomeHero
        eyebrow={BRAND_NAME}
        title={<>Where your people<br />gather</>}
        subtitle="Find events for your people, or host events for your community — one ticket that works on both sides of the digital divide."
        ctas={[
          { label: "Browse events", shortLabel: "Browse",  href: "/browse",     variant: "solid" },
          { label: "Host an event", shortLabel: "Host",    href: "/events/new", variant: "ghost" }
        ]}
        imageSrc="/community/events-new-hero.jpg"
        imageAlt="People gathered at a live event"
      />

      {/* ───────── CATEGORY CIRCLES ───────── */}
      <CategoryCircles />

      {/* ───────── Recommendations for you (signed-in + interests) ─────────
           Warm cream band — first rhythmic beat after the hero. */}
      {forYou.length > 0 && (
        <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
            <SectionHeader
              eyebrow="For you"
              title="Recommendations for you"
              subtitle={`Based on your interests${viewerCity ? ` and events in ${viewerCity}` : ""}.`}
              action={{ label: "Explore more events", href: "/browse" }}
            />
            <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {forYou.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        </section>
      )}

      {/* ───────── BROWSING EVENTS IN [CITY] ▾ — parchment (default page bg) ───────── */}
      <CityEventsSection
        city={selectedCity}
        cities={citiesForPicker}
        when={selectedWhen}
      />

      {/* ───────── ACROSS [COUNTRY] ─────────
           Once we've shown what's in the viewer's city, the next sweep
           in the order is "neighbouring cities" — i.e. the rest of the
           same country. Section is skipped when the country has no
           other-city events (e.g. selectedCity is the only featured one
           in that country) or when we couldn't resolve a country.
           The section header carries the country label so individual
           cards stay clean — no per-card city/country chip. */}
      {selectedCountry && countryEvents.length > 0 && (
        <section className="bg-cream-100 border-t border-[color:var(--border-hairline)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
            <SectionHeader
              eyebrow="Nearby"
              title={`Across ${selectedCountry}`}
              subtitle={`More gatherings beyond ${selectedCity} — neighbouring cities, same country.`}
              action={{
                label: "Explore more events",
                href:  "/browse"
              }}
            />
            <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {countryEvents.map((e) => <EventCard key={e.id} event={e as never} />)}
            </div>
          </div>
        </section>
      )}

      {/* ───────── CITIES CHIPS — warm parchment band with a gold rule above ───────── */}
      <section className="bg-cream-100 relative border-y-2 border-ink">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <SectionHeader
            eyebrow="Where"
            title="Where communities gather"
            subtitle="From home to every corner of the map — follow the communities."
          />
          <div className="flex flex-wrap gap-3">
            {FEATURED_CITIES.map((c, i) => (
              <Link
                key={c.slug}
                href={`/events/city/${c.slug}`}
                className={
                  "group inline-flex items-center gap-2 border-2 border-ink px-3.5 py-2 text-[14px] font-bold shadow-pop " +
                  "transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] " +
                  ["bg-hibiscus text-white", "bg-gold text-ink", "bg-nile text-white", "bg-acacia text-white", "bg-white text-ink"][i % 5]
                }
                aria-label={`Browse events in ${c.label}, ${c.country}`}
              >
                <span>{c.label}</span>
                <span className="font-medium opacity-80">{c.country}</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17L17 7" />
                  <path d="M9 7h8v8" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FEATURED — parchment ─────────
           City-scoped first, then global fallback. Title surfaces the
           area so the viewer always knows what they're looking at. */}
      {featured.length > 0 && (
        <section className="py-10 sm:py-14 lg:py-16 relative">
          <hr aria-hidden className="rule-editorial absolute top-0 inset-x-0 max-w-7xl mx-auto" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Spotlight"
              title={featuredFromCity ? `Featured in ${selectedCity}` : "Featured this week"}
              subtitle={featuredFromCity
                ? undefined
                : `Not many featured picks in ${selectedCity} yet — here's what's spotlit around the world.`}
              action={{
                label: "Explore more events",
                href:  `/browse?city=${encodeURIComponent(selectedCity)}`
              }}
            />
            <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((e) => <EventCard key={e.id} event={e as never} />)}
            </div>
          </div>
        </section>
      )}

      {/* ───────── UPCOMING — cream band (closes the rhythm before dark CTA) ───────── */}
      <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <SectionHeader
            eyebrow="Calendar"
            title={upcomingFromCity ? `Upcoming in ${selectedCity}` : "Upcoming events"}
            subtitle={upcomingFromCity
              ? undefined
              : `Few upcoming events in ${selectedCity} right now — here's what's coming up around the world.`}
            action={{
              label: "Explore more events",
              href:  `/browse?city=${encodeURIComponent(selectedCity)}`
            }}
          />
          {upcoming.length === 0 ? (
            <EmptyState
              title={`No events on the calendar in ${selectedCity} — yet`}
              body="Be the first to gather the community. Setup takes five minutes on your phone."
              primary={{ label: "Create an event", href: "/events/new" }}
            />
          ) : (
            <div className="grid gap-x-5 gap-y-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {upcoming.map((e) => <EventCard key={e.id} event={e as never} />)}
            </div>
          )}
        </div>
      </section>

      {/* ───────── ORGANIZER PITCH ───────── */}
      <section className="bg-organizer-pitch text-white">
        <div aria-hidden className="beads beads-lg" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 grid gap-8 sm:gap-10 md:grid-cols-2 items-center">
          <div>
            <div className="inline-block bg-gold text-ink border-2 border-white px-2 py-0.5 text-[12px] font-bold">
              For organizers
            </div>
            <h2 className="mt-3 font-display text-[30px] md:text-[42px] font-black leading-[1.02]">
              If you gather us,
              <br />we&rsquo;ll do the ticketing.
            </h2>
            <p className="mt-3 text-white/85 max-w-lg text-[14px] leading-relaxed">
              Five-minute setup on a phone. Cards, Apple Pay, Google Pay, and mobile money —
              all in one checkout. Keep more of your revenue, keep your community close.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/events/new" className="btn btn-gold">
                Start hosting — it&rsquo;s free
              </Link>
              <Link
                href="/for-organizers"
                className="btn btn-outline-light"
              >
                Learn more
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Five-minute setup", "Publish on your phone. Draft, edit, launch when ready.", "bg-hibiscus text-white"],
              ["Cross-border checkout", "Cards, mobile money, and local rails. One page, every way your audience pays.", "bg-gold text-ink"],
              ["Fair fees", "2.9% + $0.50 on cards. 2.5% + $0.25 on mobile money. No monthly minimums.", "bg-nile text-white"],
              ["Keep your community", "Followers, discussions, organizer calendar, built in.", "bg-acacia text-white"]
            ].map(([t, b, tone]) => (
              <li key={t} className={"p-5 border-2 border-white shadow-[5px_5px_0_0_#fff] " + tone}>
                <div className="font-display font-black text-[17px] leading-tight font-semiwide">{t}</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed opacity-90">{b}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
