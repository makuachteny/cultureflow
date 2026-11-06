import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import DashboardHero from "@/components/organizer/DashboardHero";
import Stat from "@/components/ui/Stat";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────
   Organizer reports — summary across the whole account. Offers
   CSV exports for orders and attendees. When there's no data, a
   friendly empty state points them at creating an event.
   ───────────────────────────────────────────────────────────── */

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/reports");

  const [eventCount, ordersAgg, ticketsAgg] = await Promise.all([
    prisma.event.count({ where: { organizerId: session.user.id } }),
    prisma.order.aggregate({
      where: { event: { organizerId: session.user.id }, status: "PAID" },
      _count: true,
      _sum: { totalCents: true }
    }),
    prisma.ticket.count({
      where: { event: { organizerId: session.user.id }, status: { in: ["ISSUED", "CHECKED_IN"] } }
    })
  ]);

  const isEmpty = eventCount === 0 || (ordersAgg._count ?? 0) === 0;

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-3xl py-12 sm:py-16 lg:py-20">
        <div className="card p-10 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-nile-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-nile/60" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="M7 15l4-4 3 3 5-7" />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-[26px] font-extrabold text-nile-900 tracking-tight">Nothing to report yet</h1>
          <p className="mt-2 text-ink-600 max-w-md mx-auto">
            Your reports will populate here once you&rsquo;ve sold tickets to an event.
            Start by publishing one.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {eventCount === 0 ? (
              <Link href="/dashboard/events/new" className="btn btn-primary">Create your first event</Link>
            ) : (
              <Link href="/dashboard/events" className="btn btn-primary">Manage events</Link>
            )}
            <Link href="/dashboard/marketing" className="btn btn-ghost">Share your event</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <DashboardHero
        tone="gold"
        eyebrow="Analytics"
        title="Lifetime numbers,"
        accent="ready to export."
        lede={`Ticket sales, revenue, and attendance across every event you've hosted on ${BRAND_NAME}. Pull a CSV for bookkeeping in one click.`}
        ctas={[
          { label: "Export orders CSV",     href: "/api/exports/orders",    variant: "primary" },
          { label: "Export attendees CSV",  href: "/api/exports/attendees", variant: "ghost"   }
        ]}
        kpi={{
          label:   "Lifetime paid revenue",
          value:   formatPrice(ordersAgg._sum.totalCents ?? 0),
          caption: `${(ordersAgg._count ?? 0).toLocaleString()} paid orders · ${ticketsAgg.toLocaleString()} tickets issued`
        }}
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Published events" value={eventCount.toLocaleString()} />
        <Stat label="Paid orders"      value={(ordersAgg._count ?? 0).toLocaleString()} />
        <Stat label="Tickets issued"   value={ticketsAgg.toLocaleString()} />
      </div>
      <div className="mt-4">
        <Stat label="Lifetime paid revenue" value={formatPrice(ordersAgg._sum.totalCents ?? 0)} size="lg" />
      </div>

      <div className="mt-10 card p-6">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Exports</h2>
        <p className="mt-1 text-sm text-ink-600">
          Pull structured data for bookkeeping, marketing analytics, or your own dashboards.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ExportRow label="Orders (CSV)"    hint="Every order across your events"                href="/api/exports/orders" />
          <ExportRow label="Attendees (CSV)" hint="Name, email, ticket tier per attendee"         href="/api/exports/attendees" />
          <ExportRow label="Payouts (CSV)"   hint="Gross, service fee, and net by paid order"     href="/api/exports/payouts" />
        </div>
      </div>
    </div>
  );
}

function ExportRow({ label, hint, href }: { label: string; hint: string; href: string }) {
  return (
    <div className="rounded-md border border-[color:var(--border-hairline)] p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-ink-900">{label}</div>
        <div className="text-[12px] text-ink-500">{hint}</div>
      </div>
      <a
        href={href}
        download
        className="btn btn-primary btn-sm shrink-0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        Export
      </a>
    </div>
  );
}
