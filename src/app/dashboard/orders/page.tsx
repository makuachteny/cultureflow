import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import DashboardHero from "@/components/organizer/DashboardHero";
import Stat from "@/components/ui/Stat";
import StatusPill from "@/components/ui/StatusPill";

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────
   Orders page for organizers: lists orders against the signed-in
   user's events. Searchable by order id / buyer email / name,
   filterable by status and date range. Server-rendered; the
   form GETs back to this page with query params.
   ───────────────────────────────────────────────────────────── */

const RANGE_DAYS: Record<string, number> = {
  "7":   7,
  "30":  30,
  "90":  90,
  "365": 365,
  "all": 0
};

const STATUSES = new Set(["PENDING", "PAID", "CANCELLED", "REFUNDED", "FAILED"] as const);

type SP = { q?: string; status?: string; range?: string; page?: string };
const PAGE_SIZE = 25;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/orders");

  /* ────────── Validate inputs ────────── */
  const q      = (searchParams.q ?? "").trim().slice(0, 120);
  const status = STATUSES.has(searchParams.status as never)
    ? (searchParams.status as "PENDING" | "PAID" | "CANCELLED" | "REFUNDED") : "";
  const range  = searchParams.range && searchParams.range in RANGE_DAYS ? searchParams.range : "90";
  const page   = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const skip   = (page - 1) * PAGE_SIZE;

  const days = RANGE_DAYS[range];
  const since = days > 0 ? new Date(Date.now() - days * 24 * 3600 * 1000) : null;

  /* ────────── Build query ────────── */
  const where: Prisma.OrderWhereInput = {
    event: { organizerId: session.user.id },
    ...(status ? { status } : {}),
    ...(since  ? { createdAt: { gte: since } } : {}),
    ...(q ? {
      OR: [
        { id:   { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { name:  { contains: q, mode: "insensitive" } } }
      ]
    } : {})
  };

  const [orders, total, paidAgg, refundedCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user:    { select: { id: true, name: true, email: true } },
        event:   { select: { id: true, title: true, slug: true } },
        tickets: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" },
      skip, take: PAGE_SIZE
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where: { ...where, status: "PAID" },
      _sum:   { totalCents: true },
      _count: { _all: true }
    }),
    prisma.order.count({ where: { ...where, status: "REFUNDED" } })
  ]);

  const totalRevenueCents = paidAgg._sum.totalCents ?? 0;
  const paidCount         = paidAgg._count._all;
  const avgOrderCents     = paidCount > 0 ? Math.round(totalRevenueCents / paidCount) : 0;
  const totalPages        = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters        = Boolean(q || status || range !== "90");

  return (
    <div className="w-full">
      <DashboardHero
        tone="gold"
        eyebrow="Orders"
        title="Every paid ticket,"
        accent="every refund."
        lede="Search by order id, buyer email, or attendee name. Filter by status and date — what you see is what you'll see in your CSV export."
        ctas={[
          { label: "Open the orders report", href: "/dashboard/reports", variant: "primary" }
        ]}
        kpi={{
          label:   "Paid in window",
          value:   formatPrice(totalRevenueCents),
          caption: range === "all"
            ? `${total.toLocaleString()} matching orders, all time`
            : `${total.toLocaleString()} matching orders · last ${range} days`
        }}
      />

      {/* ─── Summary row ─── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Stat label="Matching orders"  value={total.toLocaleString()}
              caption={range === "all" ? "All time" : `Last ${range} days`} />
        <Stat label="Paid revenue"     value={formatPrice(totalRevenueCents)} tone="acacia"
              caption={`${paidCount.toLocaleString()} paid orders`} />
        <Stat label="Avg order value"  value={paidCount > 0 ? formatPrice(avgOrderCents) : "—"} tone="gold"
              caption={paidCount > 0 ? "Across paid orders in window" : "No paid orders yet"} />
        <Stat label="Refunded"         value={refundedCount.toLocaleString()}
              tone={refundedCount > 0 ? "hibiscus" : "muted"}
              caption={refundedCount > 0 ? "Orders fully refunded" : "Clean slate"} />
      </div>

      {/* ─── Filters ─── */}
      <form action="/dashboard/orders" className="card p-5 grid gap-3 md:grid-cols-6 mb-8">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search order ID, buyer name or email"
          className="input md:col-span-3"
          aria-label="Search orders"
        />
        <select name="status" defaultValue={status} className="select" aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
          <option value="FAILED">Failed</option>
        </select>
        <select name="range" defaultValue={range} className="select" aria-label="Filter by date range">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
          <option value="all">All time</option>
        </select>
        <button className="btn btn-primary">Apply</button>
        {hasFilters && (
          <Link href="/dashboard/orders" className="md:col-span-6 text-sm font-semibold text-nile hover:underline">
            Clear all filters
          </Link>
        )}
      </form>

      {/* ─── Results ─── */}
      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-xl font-semibold text-nile">No orders yet.</h2>
          <p className="mt-2 text-ink-600">
            {hasFilters
              ? "No orders match these filters. Try widening the date range or clearing them."
              : "Once someone buys a ticket to one of your events, it'll show up here."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {hasFilters && <Link href="/dashboard/orders" className="btn btn-ghost">Clear filters</Link>}
            <Link href="/dashboard/events" className="btn btn-primary">View your events</Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-nile-50 text-left">
              <tr>
                <Th>Order</Th>
                <Th>Buyer</Th>
                <Th>Event</Th>
                <Th>Tickets</Th>
                <Th>Status</Th>
                <Th>Total</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-[color:var(--border-hairline)] hover:bg-nile-50/40">
                  <Td>
                    <span className="font-mono-ed text-[12px] text-ink-600">#{o.id.slice(0, 8).toUpperCase()}</span>
                  </Td>
                  <Td>
                    <div className="font-semibold text-ink">{o.user.name ?? "—"}</div>
                    <div className="text-ink-500 text-[12px]">{o.user.email}</div>
                  </Td>
                  <Td>
                    <Link href={`/events/${o.event.slug}`} className="text-nile hover:underline">
                      {o.event.title}
                    </Link>
                  </Td>
                  <Td>{o.tickets.length}</Td>
                  <Td><StatusPill status={o.status} /></Td>
                  <Td className="font-semibold">{formatPrice(o.totalCents, o.currency)}</Td>
                  <Td className="text-ink-600">{formatDate(o.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <nav className="mt-6 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const qs = new URLSearchParams({ q, status, range, page: String(n) });
            return (
              <Link
                key={n}
                href={`/dashboard/orders?${qs.toString()}`}
                aria-current={n === page ? "page" : undefined}
                className={`btn ${n === page ? "btn-primary" : "btn-ghost"}`}
              >
                {n}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/* ─── Tiny table helpers (only used in this file) ─── */
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
}
