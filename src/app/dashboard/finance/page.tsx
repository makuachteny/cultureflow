import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { inferMethod, splitAmount, readFeeModel, type FeeModel } from "@/lib/finance";
import DashboardHero from "@/components/organizer/DashboardHero";
import Stat from "@/components/ui/Stat";
import StatusPill from "@/components/ui/StatusPill";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "payouts",  label: "Payouts" },
  { key: "charges",  label: "Charges" },
  { key: "credits",  label: "Credits" },
  { key: "invoices", label: "Invoices" }
] as const;
type TabKey = (typeof TABS)[number]["key"];

type SP = { tab?: string };

export default async function FinancePage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/finance");

  const raw = searchParams?.tab;
  const tab: TabKey = raw && TABS.some((t) => t.key === raw) ? (raw as TabKey) : "payouts";
  const feeModel = readFeeModel();

  // Lifetime paid revenue across the organizer's events — KPI for the hero.
  const lifetimeAgg = await prisma.order.aggregate({
    where: { event: { organizerId: session.user.id }, status: "PAID" },
    _sum: { totalCents: true }, _count: true
  });

  return (
    <div className="w-full">
      <DashboardHero
        tone="gold"
        eyebrow="Money"
        title="Track every shilling,"
        accent="every payout."
        lede="Payouts, charges, credits, invoices. The whole money flow for every event you host — net of platform + processing fees."
        ctas={[
          { label: "Payout settings", href: "/dashboard/payouts",                  variant: "primary" },
          { label: "Fee model",       href: "/dashboard/settings?tab=fees",        variant: "ghost"   }
        ]}
        kpi={{
          label:   "Lifetime gross",
          value:   formatPrice(lifetimeAgg._sum.totalCents ?? 0),
          caption: `${(lifetimeAgg._count ?? 0).toLocaleString()} paid orders`
        }}
      />

      <div className="mb-10 flex flex-wrap items-center gap-1 sm:gap-6 border-b border-[color:var(--border-hairline)] overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "payouts" ? "/dashboard/finance" : `/dashboard/finance?tab=${t.key}`}
            scroll={false}
            className={"tab whitespace-nowrap " + (t.key === tab ? "tab-active" : "")}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href="/dashboard/settings?tab=fees"
          className="tab whitespace-nowrap text-ink-600"
        >
          Settings
        </Link>
      </div>

      {tab === "payouts"  && <PayoutsView  organizerId={session.user.id} model={feeModel} />}
      {tab === "charges"  && <ChargesView  organizerId={session.user.id} model={feeModel} />}
      {tab === "credits"  && <CreditsView  organizerId={session.user.id} />}
      {tab === "invoices" && <InvoicesView organizerId={session.user.id} model={feeModel} />}
    </div>
  );
}

/* ─────────────────── Payouts ─────────────────── */

async function PayoutsView({ organizerId, model }: { organizerId: string; model: FeeModel }) {
  const orders = await prisma.order.findMany({
    where: { status: "PAID", event: { organizerId } },
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { title: true, slug: true } },
      payment: { select: { provider: true } }
    },
    take: 100
  });

  const totals = orders.reduce(
    (acc, o) => {
      const { grossCents, processorFeeCents, platformFeeCents, netCents } = splitAmount(
        o.totalCents,
        inferMethod(o.payment?.provider),
        model
      );
      acc.gross        += grossCents;
      acc.processorFee += processorFeeCents;
      acc.platformFee  += platformFeeCents;
      acc.net          += netCents;
      return acc;
    },
    { gross: 0, processorFee: 0, platformFee: 0, net: 0 }
  );

  return (
    <div className="grid gap-10 md:grid-cols-[200px_1fr]">
      <nav className="flex flex-col gap-1">
        <span className="h-10 rounded-lg bg-nile-50 px-4 leading-10 text-[14px] font-semibold text-nile">
          Summary
        </span>
        <Link href="/dashboard/finance?tab=invoices" className="h-10 rounded-lg px-4 leading-10 text-[14px] font-medium text-ink-700 hover:bg-nile-50 hover:text-nile transition-colors">
          By event
        </Link>
        <Link href="/dashboard/reports" className="h-10 rounded-lg px-4 leading-10 text-[14px] font-medium text-ink-700 hover:bg-nile-50 hover:text-nile transition-colors">
          Exports
        </Link>
      </nav>

      <div>
        <p className="mb-6 text-[13px] text-ink-500">
          Net payouts after service fees, grouped by paid order. Bank transfers and mobile-money
          payouts arrive once funds clear (typically 2–5 business days).
        </p>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat size="sm" label="Gross sales"     value={formatPrice(totals.gross)}
                caption="What attendees paid" />
          <Stat size="sm" label="Processing fees" value={formatPrice(totals.processorFee)} tone="muted"
                caption="Stripe / M-Pesa / MoMo" />
          <Stat size="sm" label="Platform fee"    value={formatPrice(totals.platformFee)} tone="gold"
                caption={`CultureFlow commission`} />
          <Stat size="sm" label="Net to you"      value={formatPrice(totals.net)}  tone="acacia"
                caption="After all fees" />
        </div>

        {orders.length === 0 ? (
          <EmptyPayouts />
        ) : (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[color:var(--border-hairline)] bg-nile-50 px-4 py-3 text-[13px] font-semibold text-nile">
              <span>Recent paid orders</span>
              <span>{orders.length}</span>
            </div>
            <ul className="divide-y divide-nile-100">
              {orders.map((o) => {
                const split = splitAmount(o.totalCents, inferMethod(o.payment?.provider), model);
                return (
                  <li key={o.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold text-nile truncate">{o.event.title}</div>
                      <div className="text-xs text-ink/60">
                        {formatDate(o.createdAt)} · {inferMethod(o.payment?.provider) === "card" ? "Card" : "Mobile money"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-nile font-tabular">
                        {formatPrice(split.netCents, o.currency)}
                      </div>
                      <div className="text-xs text-ink-500 font-tabular">
                        − {formatPrice(split.processorFeeCents + split.platformFeeCents, o.currency)} fees
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Charges ─────────────────── */

async function ChargesView({ organizerId, model }: { organizerId: string; model: FeeModel }) {
  const payments = await prisma.payment.findMany({
    where: { order: { event: { organizerId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        select: {
          id: true,
          totalCents: true,
          currency: true,
          status: true,
          createdAt: true,
          event: { select: { title: true, slug: true } },
          user:  { select: { email: true, name: true } }
        }
      }
    }
  });

  return (
    <div>
      <p className="mb-6 text-[13px] text-ink-500">
        Every charge attempted against the tickets on your events, including failed and pending
        ones. Click a row to open the attendee order.
      </p>

      {payments.length === 0 ? (
        <EmptyState
          title="No charges yet"
          blurb="Charges show up the moment an attendee submits payment — even if it doesn't succeed."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-nile-50 text-[12px] uppercase tracking-wide text-nile">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">Attendee</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Gross</th>
                <th className="text-right px-4 py-3">Processing</th>
                <th className="text-right px-4 py-3">Platform</th>
                <th className="text-right px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nile-100">
              {payments.map((p) => {
                const method = inferMethod(p.provider);
                const split = splitAmount(p.order.totalCents, method, model);
                return (
                  <tr key={p.id} className="hover:bg-nile-50/50">
                    <td className="px-4 py-3 text-ink-600 font-tabular whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/events/${p.order.event.slug}`} className="font-semibold text-nile hover:underline">
                        {p.order.event.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{p.order.user?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-600">{method === "card" ? "Card" : "Mobile money"}</td>
                    <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                    <td className="px-4 py-3 text-right font-tabular text-nile">
                      {formatPrice(split.grossCents, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-ink-500">
                      {formatPrice(split.processorFeeCents, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-gold-700">
                      {formatPrice(split.platformFeeCents, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-acacia-700 font-semibold">
                      {formatPrice(split.netCents, p.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Credits ─────────────────── */

async function CreditsView({ organizerId }: { organizerId: string }) {
  const refunds = await prisma.refundRequest.findMany({
    where: { ticket: { event: { organizerId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user:   { select: { email: true, name: true } },
      ticket: {
        select: {
          id: true,
          code: true,
          event: { select: { title: true, slug: true } },
          tier:  { select: { priceCents: true, currency: true } }
        }
      }
    }
  });

  const pendingCount  = refunds.filter((r) => r.status === "PENDING").length;
  const approvedCents = refunds
    .filter((r) => r.status === "APPROVED")
    .reduce((s, r) => s + (r.ticket.tier.priceCents ?? 0), 0);

  return (
    <div>
      <p className="mb-6 text-[13px] text-ink-500">
        Credits owed to attendees — refunds and reversals. Approving a refund here does not move
        money; it marks the ticket refunded and clears it for your payment processor.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Stat size="sm" label="Pending refunds" value={pendingCount.toLocaleString()}
              tone={pendingCount > 0 ? "hibiscus" : "default"}
              caption={pendingCount > 0 ? "Awaiting your review" : "Inbox empty"} />
        <Stat size="sm" label="Approved credits" value={formatPrice(approvedCents)} tone="acacia" />
      </div>

      {refunds.length === 0 ? (
        <EmptyState
          title="No credits outstanding"
          blurb="Attendees can request refunds from their ticket page. You'll review them here."
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-nile-100">
            {refunds.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 max-w-md">
                  <div className="font-semibold text-nile truncate">{r.ticket.event.title}</div>
                  <div className="text-xs text-ink-500">
                    Ticket {r.ticket.code} · {r.user?.email ?? "—"} · {formatDate(r.createdAt)}
                  </div>
                  {r.reason && <div className="mt-1 text-[13px] text-ink-700 line-clamp-2">{r.reason}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-nile font-tabular">
                    {formatPrice(r.ticket.tier.priceCents ?? 0, r.ticket.tier.currency ?? "USD")}
                  </span>
                  <StatusPill status={r.status} />
                  <Link href={`/dashboard/events/${r.ticket.event.slug}`} className="btn btn-ghost btn-sm">
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Invoices ─────────────────── */

async function InvoicesView({ organizerId, model }: { organizerId: string; model: FeeModel }) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      startsAt: true,
      orders: {
        where: { status: "PAID" },
        select: {
          id: true,
          totalCents: true,
          currency: true,
          createdAt: true,
          payment: { select: { provider: true } }
        }
      }
    }
  });

  const rows = events
    .map((e) => {
      const totals = e.orders.reduce(
        (acc, o) => {
          const split = splitAmount(o.totalCents, inferMethod(o.payment?.provider), model);
          acc.gross        += split.grossCents;
          acc.processorFee += split.processorFeeCents;
          acc.platformFee  += split.platformFeeCents;
          acc.net          += split.netCents;
          return acc;
        },
        { gross: 0, processorFee: 0, platformFee: 0, net: 0 }
      );
      return {
        id: e.id,
        slug: e.slug,
        title: e.title,
        startsAt: e.startsAt,
        orderCount: e.orders.length,
        currency: e.orders[0]?.currency ?? "USD",
        ...totals
      };
    })
    .filter((r) => r.orderCount > 0);

  return (
    <div>
      <p className="mb-6 text-[13px] text-ink-500">
        One invoice per event — gross sales, processing + platform fees, and net payout. Open
        an invoice to print or save as PDF.
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          blurb="Invoices are generated automatically after your first paid order for an event."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-nile-50 text-[12px] uppercase tracking-wide text-nile">
              <tr>
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Orders</th>
                <th className="text-right px-4 py-3">Gross</th>
                <th className="text-right px-4 py-3">Processing</th>
                <th className="text-right px-4 py-3">Platform</th>
                <th className="text-right px-4 py-3">Net</th>
                <th className="text-right px-4 py-3">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nile-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-nile-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/events/${r.slug}`} className="font-semibold text-nile hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{formatDate(r.startsAt)}</td>
                  <td className="px-4 py-3 text-right font-tabular">{r.orderCount}</td>
                  <td className="px-4 py-3 text-right font-tabular text-ink-700">{formatPrice(r.gross, r.currency)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-ink-500">{formatPrice(r.processorFee, r.currency)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-gold-700">{formatPrice(r.platformFee, r.currency)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-acacia-700 font-semibold">{formatPrice(r.net, r.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/events/${r.id}`} className="btn btn-ghost btn-sm">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Shared bits ─────────────────── */

function EmptyPayouts() {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto h-20 w-20 rounded-full bg-nile-50 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-nile/60" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
      </div>
      <h3 className="mt-5 font-display text-xl font-bold text-nile">No payouts yet</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-ink-600">
        Payouts appear once your paid events complete and funds clear. Add your payout details now
        so the money is ready the moment tickets sell.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard/events/new" className="btn btn-primary">Create a paid event</Link>
        <Link href="/dashboard/settings?tab=fees" className="btn btn-ghost">Review fee settings</Link>
      </div>
    </div>
  );
}

function EmptyState({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="card p-10 text-center">
      <h3 className="font-display text-lg font-bold text-nile">{title}</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-ink-600">{blurb}</p>
    </div>
  );
}
