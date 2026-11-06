import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/utils";
import DashboardHero from "@/components/organizer/DashboardHero";

export const dynamic = "force-dynamic";

const STATUSES: ReadonlySet<string> = new Set(["DRAFT", "PUBLISHED", "PAST", "CANCELLED"]);
type SP = { q?: string; status?: string };

export default async function OrganizerEventsPage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/events");

  /* ────────── Inputs (validated) ────────── */
  const q = (searchParams?.q ?? "").trim().slice(0, 120);
  const rawStatus = searchParams?.status;
  const status = rawStatus && STATUSES.has(rawStatus)
    ? (rawStatus as "DRAFT" | "PUBLISHED" | "PAST" | "CANCELLED")
    : "";

  const where: Prisma.EventWhereInput = {
    organizerId: session.user.id,
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { title:   { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { city:    { contains: q, mode: "insensitive" } }
      ]
    } : {})
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: "desc" },
    include: { ticketTiers: true, _count: { select: { tickets: true, comments: true } } }
  });

  const eventIds = events.map((e) => e.id);
  const revenue = eventIds.length === 0 ? [] : await prisma.order.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, status: "PAID" },
    _sum: { totalCents: true }
  });
  const revenueByEvent = Object.fromEntries(revenue.map((r) => [r.eventId, r._sum.totalCents ?? 0]));

  const hasFilters = Boolean(q || status);

  // KPI: lifetime number of events the organizer has launched.
  const totalEvents = await prisma.event.count({ where: { organizerId: session.user.id } });
  const publishedCount = await prisma.event.count({
    where: { organizerId: session.user.id, status: "PUBLISHED" }
  });

  return (
    <div className="w-full">
      <DashboardHero
        tone="nile"
        eyebrow="Catalog"
        title="Your events,"
        accent="all in one place."
        lede="Drafts, published, past, and cancelled — every event you've created. Filter, search, or jump straight into a new build."
        ctas={[
          { label: "Create event",   href: "/dashboard/events/new",       variant: "primary" },
          { label: "Use a template", href: "/dashboard/events/templates", variant: "ghost"   }
        ]}
        kpi={{
          label:   "Live now",
          value:   publishedCount.toLocaleString(),
          caption: `${totalEvents.toLocaleString()} total ever`
        }}
      />

      {/* ─── Filter form — real GET submission ─── */}
      <form
        action="/dashboard/events"
        className="mb-8 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-10 rounded-full border border-[color:var(--border-hairline)] bg-white px-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-ink-500" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              name="q"
              defaultValue={q}
              className="w-56 bg-transparent text-[14px] focus:outline-none placeholder:text-ink-400"
              placeholder="Search your events"
              aria-label="Search your events"
            />
          </div>

          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-full border border-[color:var(--border-hairline)] bg-white px-4 text-[13px] font-semibold text-nile cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Drafts</option>
            <option value="PAST">Past</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button type="submit" className="btn btn-primary">Apply</button>
          {hasFilters && (
            <Link href="/dashboard/events" className="text-sm font-semibold text-nile hover:underline">
              Clear
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/events/templates" className="btn btn-ghost">
            Use a template
          </Link>
          <Link href="/dashboard/events/new" className="btn btn-gold">
            Create event
          </Link>
        </div>
      </form>

      {/* ─── Result count ─── */}
      <div aria-live="polite" className="mb-4 text-sm text-ink-600">
        {events.length} {events.length === 1 ? "event" : "events"}
        {q     ? <> matching <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span></> : null}
        {status ? <> · status {status.toLowerCase()}</> : null}
      </div>

      {/* ─── Results ─── */}
      {events.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-nile-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8 text-nile/70" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 9h18M8 3v4M16 3v4" />
            </svg>
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-nile">
            {hasFilters ? "No events match those filters" : "No events to show"}
          </h3>
          <p className="mt-2 text-sm text-ink-600 max-w-md mx-auto">
            {hasFilters
              ? "Try widening the date or status filter, or clear them to see every event you host."
              : "Get started by creating your first event. It takes just a few minutes."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {hasFilters && <Link href="/dashboard/events" className="btn btn-ghost">Clear filters</Link>}
            <Link href="/dashboard/events/templates" className="btn btn-ghost">Use a template</Link>
            <Link href="/dashboard/events/new" className="btn btn-primary">Create event</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const cap = e.ticketTiers.reduce((s, t) => s + t.quantity, 0);
            return (
              <li key={e.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[240px] flex-1">
                  <Link href={`/events/${e.slug}`} className="font-semibold text-nile hover:underline">
                    {e.title}
                  </Link>
                  <div className="text-xs text-ink-500">
                    {formatDate(e.startsAt)} · {e.status}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 text-sm text-ink">
                  <div>
                    <div className="text-xs text-ink-500">Tickets</div>
                    <span className="font-tabular">{e._count.tickets}</span> / <span className="font-tabular">{cap}</span>
                  </div>
                  <div>
                    <div className="text-xs text-ink-500">Revenue</div>
                    <span className="font-tabular">{formatPrice(revenueByEvent[e.id] ?? 0, "USD")}</span>
                  </div>
                  <div>
                    <div className="text-xs text-ink-500">Comments</div>
                    <span className="font-tabular">{e._count.comments}</span>
                  </div>
                </div>
                <Link href={`/dashboard/events/${e.id}`} className="btn btn-ghost">
                  Manage
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
