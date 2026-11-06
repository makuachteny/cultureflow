import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { TicketStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────
   Organizer hub — widescreen layout that fills the canvas.

     ┌──────────────────────────────────────────────────────────┐
     │  Hero banner (nile gradient)                             │
     │    "Hey, Teny"   + two primary CTAs + live headline kpi │
     ├─────────────┬─────────────┬─────────────┬────────────────┤
     │  Stat A     │  Stat B     │  Stat C     │  Stat D        │
     ├─────────────┴─────────────┴─────────────┴────────────────┤
     │  Checklist (conditional)                                 │
     ├──────────────────────────────────────┬───────────────────┤
     │  Recent events (list with thumbs)    │  Get discovered   │
     │                                       │  This month       │
     ├──────────────────────────────────────┴───────────────────┤
     │  Resources — three colorful tiles                        │
     └──────────────────────────────────────────────────────────┘
   ───────────────────────────────────────────────────────────── */

export default async function OrganizerHome() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Tickets are "sold" once they're ISSUED or CHECKED_IN — REFUNDED and
  // CANCELLED don't count toward revenue or attendance, so the dashboard
  // KPIs must filter them out. Otherwise a refunded ticket still inflates
  // the "Tickets sold" tile, which then drifts away from the order/payout
  // numbers the organizer reconciles against.
  const SOLD_STATUS = { in: [TicketStatus.ISSUED, TicketStatus.CHECKED_IN] };

  const [
    user, events,
    eventCount,
    payoutAgg,      ticketsLifetime,
    payoutMonthAgg, ticketsMonth,
    upcomingCount,  draftCount, followerCount,
    pendingRefundCount
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, bio: true }
    }),
    prisma.event.findMany({
      where: { organizerId: session.user.id },
      orderBy: { startsAt: "desc" },
      take: 6,
      include: { ticketTiers: true, _count: { select: { tickets: true, comments: true } } }
    }),
    // Total event count across all statuses — the Events stat tile shows
    // this. Previously the tile rendered events.length (capped at 6 by
    // the findMany above) so any organizer with >6 events saw a wrong
    // total.
    prisma.event.count({
      where: { organizerId: session.user.id }
    }),
    prisma.order.aggregate({
      where: { event: { organizerId: session.user.id }, status: "PAID" },
      _sum:   { totalCents: true },
      _count: true
    }),
    prisma.ticket.count({
      where: {
        event: { organizerId: session.user.id },
        status: SOLD_STATUS
      }
    }),
    prisma.order.aggregate({
      where: {
        event: { organizerId: session.user.id },
        status: "PAID",
        createdAt: { gte: startOfMonth }
      },
      _sum:   { totalCents: true },
      _count: true
    }),
    prisma.ticket.count({
      where: {
        event: { organizerId: session.user.id },
        status: SOLD_STATUS,
        createdAt: { gte: startOfMonth }
      }
    }),
    prisma.event.count({
      where: {
        organizerId: session.user.id,
        status: "PUBLISHED",
        startsAt: { gte: new Date() }
      }
    }),
    prisma.event.count({
      where: { organizerId: session.user.id, status: "DRAFT" }
    }),
    prisma.follow.count({
      where: { followingId: session.user.id }
    }),
    prisma.refundRequest.count({
      where: {
        status: "PENDING",
        ticket: { event: { organizerId: session.user.id } }
      }
    })
  ]);

  if (!user) redirect("/sign-in");

  const firstName = (user.name || user.email).split(/\s+|@/)[0] || "there";
  const isAdmin   = session.user.role === "ADMIN";

  // Admin-only: lightweight platform-wide counts. Loaded only when the
  // viewer is an admin so we don't pay these queries for organizers.
  const adminStats = isAdmin
    ? await Promise.all([
        prisma.user.count(),
        prisma.event.count({ where: { status: "PUBLISHED" } }),
        prisma.ticket.count(),
        prisma.refundRequest.count({ where: { status: "PENDING" } })
      ]).then(([users, publishedEvents, tickets, pendingRefunds]) => ({
        users, publishedEvents, tickets, pendingRefunds
      }))
    : null;

  // Lifetime totals (shown in the hero + stat row).
  const totalRevenueCents = payoutAgg._sum.totalCents ?? 0;
  const totalOrders       = payoutAgg._count ?? 0;
  const totalTickets      = ticketsLifetime;

  // Month-to-date (shown in the "This month" side card — must be
  // genuinely month-scoped so it doesn't just repeat the stat row).
  const monthRevenueCents = payoutMonthAgg._sum.totalCents ?? 0;
  const monthOrders       = payoutMonthAgg._count ?? 0;
  const monthTickets      = ticketsMonth;

  const hasEvent   = events.length > 0;
  const hasProfile = Boolean(user.name && user.bio && user.image);
  const hasBank    = false; // Stripe Connect placeholder
  const checklistDone = Number(hasEvent) + Number(hasProfile) + Number(hasBank);
  const checklistTotal = 3;
  const checklistComplete = checklistDone === checklistTotal;

  return (
    <div className="space-y-8">
      {/* ─── Hero banner ───
          Nile gradient scene with a gold radial in the corner — mirrors
          the organizer-pitch section on the marketing site so the signed-
          in home feels like the same product, not a different app. */}
      <section
        className="relative overflow-hidden rounded-2xl text-white shadow-sm"
        style={{ background: "var(--gradient-organizer-pitch)" }}
      >
        <div className="relative z-10 grid gap-5 sm:gap-8 p-5 sm:p-8 lg:p-10 xl:grid-cols-[1fr,auto] xl:items-end">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-nile-900/40 px-2.5 py-1 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gold-400">
              Dashboard
            </span>
            <h1 className="mt-3 sm:mt-4 font-display text-[24px] sm:text-[40px] lg:text-[48px] font-extrabold tracking-tight leading-[1.06] sm:leading-[1.03]">
              Hey {firstName}, <span className="text-gold-400">let&apos;s make something</span> happen
            </h1>
            <p className="mt-2 sm:mt-3 max-w-2xl text-[13.5px] sm:text-[15px] text-white/85 leading-relaxed">
              {upcomingCount > 0
                ? `You have ${upcomingCount} upcoming ${upcomingCount === 1 ? "event" : "events"} on the books. Keep the momentum going.`
                : "Spin up your next gathering — it takes under five minutes to publish."}
            </p>
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/dashboard/events/new" className="btn btn-gold">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                Create event
              </Link>
              <Link
                href="/dashboard/events/templates"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/40 px-4 h-10 text-[14px] font-semibold text-white hover:bg-nile-900/40 transition-colors"
              >
                Use a template
              </Link>
            </div>
          </div>

          {/* Glance KPI pillar — reads the most useful number in context.
              Compact stat row on mobile (label + value on one line) so the
              hero doesn't run a full screen-height tall on small phones;
              relaxes back to the stacked card layout from sm:+. */}
          <div className="shrink-0 rounded-xl border border-gold-400/30 bg-nile-900/40 p-4 sm:p-5 xl:min-w-[260px] flex sm:block items-baseline justify-between gap-3">
            <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
              Lifetime revenue
            </div>
            <div>
              <div className="sm:mt-1.5 font-display text-[24px] sm:text-[36px] font-extrabold tracking-tight text-gold-400 font-tabular leading-none">
                {formatPrice(totalRevenueCents)}
              </div>
              <div className="hidden sm:block mt-1 text-[13px] text-white/75">
                from {totalOrders.toLocaleString()} paid {totalOrders === 1 ? "order" : "orders"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stat row — 4 colour-tinted cards ───
          Each uses a different palette tint so the row reads as a
          dashboard, not a flat list. Mobile fits all four in a 2×2
          block (no awkward single-column tower); desktop fans out to
          a single 4-tile row at lg:+. */}
      <section className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile
          tone="nile"
          label="Events"
          value={eventCount.toLocaleString()}
          hint={draftCount > 0 ? `${draftCount} in draft` : "All published"}
          href="/dashboard/events"
          icon={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>}
        />
        <StatTile
          tone="gold"
          label="Tickets sold"
          value={totalTickets.toLocaleString()}
          hint={`${upcomingCount.toLocaleString()} upcoming ${upcomingCount === 1 ? "event" : "events"}`}
          href="/dashboard/orders"
          icon={<path d="M4 9a2 2 0 002 2h.01a2 2 0 010 4H6a2 2 0 00-2 2v1a2 2 0 002 2h12a2 2 0 002-2v-1a2 2 0 00-2-2h-.01a2 2 0 010-4H18a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v1z" />}
        />
        <StatTile
          tone="acacia"
          label="Paid revenue"
          value={formatPrice(totalRevenueCents)}
          hint={totalOrders > 0 ? `Avg ${formatPrice(Math.round(totalRevenueCents / Math.max(1, totalOrders)))} / order` : "No paid orders yet"}
          href="/dashboard/finance"
          icon={<><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 11h18" /><circle cx="12" cy="15" r="1.6" /></>}
        />
        <StatTile
          tone="hibiscus"
          label="Followers"
          value={followerCount.toLocaleString()}
          hint="Notified on new events"
          href="/dashboard/marketing"
          icon={<><circle cx="9" cy="8" r="4" /><circle cx="17" cy="10" r="3" /><path d="M2 21a7 7 0 0114 0M14 17a5 5 0 018 0" /></>}
        />
      </section>

      {/* ─── Admin-only platform overview ───
          Same colourful StatTile family as the organizer's own KPI row
          above so the two sections feel consistent — just deep-linked
          into admin surfaces instead of the organizer's data. Hidden
          for ORGANIZER role; they only see their own numbers. */}
      {isAdmin && adminStats && (
        <section aria-label="Platform overview" className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-0.5">
            <h2 className="font-display text-[16px] sm:text-[18px] font-bold text-nile-900">
              Platform overview
            </h2>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-[12.5px] sm:text-[13px] font-semibold text-nile hover:text-nile-700 motion-safe:transition-colors whitespace-nowrap group"
            >
              Open admin
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 motion-safe:transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatTile
              tone="nile"
              label="Users"
              value={adminStats.users.toLocaleString()}
              hint="Total accounts"
              href="/admin?tab=users"
              icon={
                <>
                  <circle cx="9" cy="8" r="3.2" />
                  <circle cx="17" cy="10" r="2.6" />
                  <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M14 16.5c1-1.5 2.4-2.5 4-2.5 2.5 0 4 1.5 4 4" />
                </>
              }
            />
            <StatTile
              tone="gold"
              label="Live events"
              value={adminStats.publishedEvents.toLocaleString()}
              hint="Currently published"
              href="/admin?tab=events"
              icon={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>}
            />
            <StatTile
              tone="acacia"
              label="Tickets issued"
              value={adminStats.tickets.toLocaleString()}
              hint="Across all events"
              href="/dashboard/orders"
              icon={
                <>
                  <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" />
                  <path d="M9 6v12" strokeDasharray="2 3" />
                </>
              }
            />
            <StatTile
              tone="hibiscus"
              label="Pending refunds"
              value={adminStats.pendingRefunds.toLocaleString()}
              hint={adminStats.pendingRefunds > 0 ? "Need your review" : "All caught up"}
              href="/dashboard/finance?tab=credits"
              icon={<><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>}
            />
          </div>
        </section>
      )}

      {/* ─── Refund alert ───
          Only shown when there are pending refund requests. Loud
          enough to catch the eye without screaming when nothing's
          wrong. */}
      {pendingRefundCount > 0 && (
        <section
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hibiscus/30 bg-hibiscus/5 px-5 py-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hibiscus/10 text-hibiscus">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[16px] font-bold text-hibiscus">
                {pendingRefundCount.toLocaleString()} refund {pendingRefundCount === 1 ? "request" : "requests"} waiting on you
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-700">
                Attendees are expecting an answer. Approving here marks the ticket refunded and clears it for your processor.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/finance?tab=credits"
            className="btn btn-primary shrink-0"
          >
            Review refunds
          </Link>
        </section>
      )}

      {/* ─── Onboarding checklist ───
          Only shown while anything is incomplete. Once all three items
          are done, the checklist gives way to a richer content layout. */}
      {!checklistComplete && (
        <section className="rounded-2xl border border-[color:var(--border-hairline)] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[22px] font-bold text-nile-900">Get set up</h2>
              <p className="mt-1 text-[14px] text-ink-600">
                Three quick wins that unlock the rest of the platform.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-acacia-500 transition-[width]"
                  style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-ink-600">
                {checklistDone} / {checklistTotal}
              </span>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            <ChecklistCard
              done={hasEvent}
              title="Create your first event"
              blurb="Publish an event to reach the community."
              href="/dashboard/events/new"
              cta="Start here"
            />
            <ChecklistCard
              done={hasProfile}
              title="Set up your organizer profile"
              blurb="Photo, bio, tribe — builds trust with attendees."
              href="/dashboard/settings"
              cta={hasProfile ? "Edit profile" : "Complete"}
            />
            <ChecklistCard
              done={hasBank}
              title="Add payout details"
              blurb="Get paid via bank or mobile money."
              href="/dashboard/finance"
              cta="Set up payouts"
            />
          </ul>
        </section>
      )}

      {/* ─── Main split — recent events + side cards ───
          Collapses to single column below xl so nothing gets cramped
          on tablet-sized windows. */}
      <section className="grid gap-6 xl:grid-cols-[1fr,340px]">
        <div className="rounded-2xl border border-[color:var(--border-hairline)] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-hairline)] px-6 py-5">
            <div>
              <h2 className="font-display text-[20px] font-bold text-nile-900">Your events</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">The last six, most recent first.</p>
            </div>
            <Link href="/dashboard/events" className="text-[13px] font-semibold text-nile hover:underline">
              View all →
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-nile-50 text-nile">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-[18px] font-bold text-nile">No events yet</h3>
              <p className="mt-1.5 text-[13px] text-ink-600">Publish your first event — it takes under five minutes.</p>
              <Link href="/dashboard/events/new" className="btn btn-primary mt-5">Create event</Link>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--border-hairline)]">
              {events.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6">
          <div
            className="relative overflow-hidden rounded-2xl p-6 text-nile-900"
            style={{ background: "linear-gradient(135deg, #FFF6D6 0%, #FFE493 60%, #FFD36E 100%)" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-nile-900/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-400">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17l5-5 4 4 6-6" /><path d="M14 10h8v8" />
              </svg>
              Get discovered
            </span>
            <h3 className="mt-4 font-display text-[20px] font-bold leading-tight">
              A complete profile ranks higher
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-nile-900/80">
              Add a photo, bio, and tribe so attendees can find and trust you. Profiles with all three see roughly 2× more event views.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-5 inline-flex items-center gap-1 text-[13px] font-bold text-nile-900 hover:underline"
            >
              Set up your profile →
            </Link>
          </div>

          <div className="rounded-2xl border border-[color:var(--border-hairline)] bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-[16px] font-bold text-nile-900">This month</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {now.toLocaleString(undefined, { month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <SideStat label="Paid orders"  value={monthOrders.toLocaleString()} />
              <SideStat label="Tickets sold" value={monthTickets.toLocaleString()} />
              <SideStat label="Revenue"      value={formatPrice(monthRevenueCents)} />
            </div>
            <Link href="/dashboard/reports" className="mt-5 inline-flex text-[13px] font-semibold text-nile hover:underline">
              View full reports →
            </Link>
          </div>
        </aside>
      </section>

      {/* ─── Resources — three colourful, theme-matched tiles ─── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[20px] font-bold text-nile-900">Top resources</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-500">Short reads that help you sell out.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ResourceTile
            href="/help"
            eyebrow="Pricing"
            title="Price a ticket that converts"
            blurb="Tiers, fee split, and anchors — the basics you can apply today."
            gradient="linear-gradient(135deg, #EEF4FF 0%, #DBE6FA 100%)"
            accent="text-nile"
          />
          <ResourceTile
            href="/dashboard/marketing"
            eyebrow="Marketing"
            title="Fill seats, not feeds"
            blurb="Emails, WhatsApp and community-group tactics that actually move tickets."
            gradient="linear-gradient(135deg, #FFF9E5 0%, #FFF0B8 100%)"
            accent="text-gold-800"
          />
          <ResourceTile
            href="/help"
            eyebrow="Day-of"
            title="Run a smooth check-in"
            blurb="QR scanning, queue control, and keeping the crew calm at the door."
            gradient="linear-gradient(135deg, #E4F8EF 0%, #C6EEDB 100%)"
            accent="text-acacia-700"
          />
        </div>
      </section>
    </div>
  );
}

/* ─────────── Presentational helpers ─────────── */


function StatTile({
  tone, label, value, hint, icon, href
}: {
  tone: "nile" | "gold" | "acacia" | "hibiscus";
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  /** When set the whole tile becomes a deep-link into the matching
   *  data surface (e.g. Events tile → /dashboard/events). */
  href?: string;
}) {
  const toneMap = {
    nile:     { bg: "bg-nile-50",      ring: "ring-nile-100",     icon: "bg-nile text-white",        accent: "text-nile-900" },
    gold:     { bg: "bg-[#FFF6D6]",    ring: "ring-[#FFE493]",    icon: "bg-gold text-ink-900",      accent: "text-ink-900" },
    acacia:   { bg: "bg-[#E4F8EF]",    ring: "ring-[#C6EEDB]",    icon: "bg-acacia-500 text-white",  accent: "text-acacia-700" },
    hibiscus: { bg: "bg-[#FFE9E9]",    ring: "ring-[#FFCDCD]",    icon: "bg-hibiscus text-white",    accent: "text-hibiscus" }
  }[tone];

  const cls = `relative rounded-xl sm:rounded-2xl ${toneMap.bg} ring-1 ring-inset ${toneMap.ring} p-3.5 sm:p-5 overflow-hidden ${
    href ? "block motion-safe:transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile/40" : ""
  }`;
  const inner = (
    <div className="flex items-start justify-between gap-2.5 sm:gap-3">
      <div className="min-w-0">
        <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-ink-600">{label}</div>
        <div className={`mt-1 sm:mt-1.5 font-display text-[22px] sm:text-[30px] font-extrabold tracking-tight font-tabular leading-tight ${toneMap.accent}`}>
          {value}
        </div>
        <div className="mt-0.5 text-[11.5px] sm:text-[12.5px] text-ink-600 truncate">{hint}</div>
      </div>
      <span className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${toneMap.icon}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
      </span>
    </div>
  );
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

function ChecklistCard({
  done, title, blurb, href, cta
}: {
  done: boolean; title: string; blurb: string; href: string; cta: string;
}) {
  return (
    <li className={
      "rounded-xl border bg-white p-4 transition-colors " +
      (done
        ? "border-acacia-500/30 bg-acacia-500/5"
        : "border-[color:var(--border-hairline)] hover:border-nile-200")
    }>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {done ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-acacia-500 text-white">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </span>
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-nile-200" aria-hidden />
            )}
            <h3 className={"text-[14px] font-semibold " + (done ? "text-ink-500 line-through" : "text-nile-900")}>
              {title}
            </h3>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-600 leading-relaxed">{blurb}</p>
        </div>
      </div>
      {!done && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-nile hover:underline"
        >
          {cta} →
        </Link>
      )}
    </li>
  );
}

function EventRow({
  event
}: {
  event: {
    id: string;
    slug: string;
    title: string;
    status: string;
    startsAt: Date | string;
    bannerUrl: string | null;
    city: string | null;
    country: string | null;
    _count: { tickets: number; comments: number };
  };
}) {
  const dt = new Date(event.startsAt);
  const dateLabel = dt.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
  const place = [event.city, event.country].filter(Boolean).join(", ");
  const statusTone: Record<string, string> = {
    PUBLISHED: "bg-acacia-500/10 text-acacia-700",
    DRAFT:     "bg-cream-200 text-ink-700",
    PAST:      "bg-cream-200 text-ink-500",
    CANCELLED: "bg-hibiscus/10 text-hibiscus"
  };

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-cream-100/50 transition-colors">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-nile-50">
        {event.bannerUrl ? (
          <Image
            src={event.bannerUrl}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-event-placeholder">
            <Image src="/logo-mark.svg" alt="" width={29} height={20} className="opacity-90" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="block text-[14.5px] font-semibold text-ink-900 hover:text-nile truncate"
        >
          {event.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-600">
          <span>{dateLabel}</span>
          {place && <span>· {place}</span>}
          <span>· {event._count.tickets.toLocaleString()} ticket{event._count.tickets === 1 ? "" : "s"}</span>
        </div>
      </div>
      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ${statusTone[event.status] ?? "bg-cream-200 text-ink-700"}`}>
        {event.status.toLowerCase()}
      </span>
      <Link
        href={`/dashboard/events/${event.id}`}
        className="shrink-0 text-[12.5px] font-semibold text-nile hover:underline"
      >
        Manage →
      </Link>
    </div>
  );
}

function SideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--border-hairline)] last:border-0 pb-2 last:pb-0">
      <span className="text-[13px] text-ink-600">{label}</span>
      <span className="font-semibold text-ink-900 font-tabular">{value}</span>
    </div>
  );
}

function ResourceTile({
  href, eyebrow, title, blurb, gradient, accent
}: {
  href: string; eyebrow: string; title: string; blurb: string;
  gradient: string; accent: string;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-0.5 hover:shadow-card"
      style={{ background: gradient }}
    >
      <div className={`text-[11px] font-bold uppercase tracking-[0.14em] ${accent}`}>{eyebrow}</div>
      <h3 className={"mt-2 font-display text-[18px] font-bold leading-snug " + accent}>{title}</h3>
      <p className="mt-2 text-[13px] text-ink-700 leading-relaxed">{blurb}</p>
      <span className={`mt-4 inline-flex items-center gap-1 text-[13px] font-bold ${accent} group-hover:underline`}>
        Read more →
      </span>
    </Link>
  );
}
