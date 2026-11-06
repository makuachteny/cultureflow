/**
 * Admin platform overview.
 *
 * Gated to ADMIN role by both middleware and the layout. Non-admins
 * never reach this code path, but the auth check stays as defence-in-
 * depth.
 *
 * Distinct from the organizer dashboard:
 *   - All KPIs are platform-wide (every user, every event, every order),
 *     not scoped to the admin's own organizer profile.
 *   - User + event tables expose moderation actions (suspend, feature,
 *     unpublish) that organizers don't see anywhere.
 *   - Moderation log surfaces the audit trail of admin actions.
 */

import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import AdminBrowser from "@/components/admin/AdminBrowser";
import DashboardHero from "@/components/organizer/DashboardHero";
import Stat from "@/components/ui/Stat";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const [
    userCount, organizerCount, attendeeCount,
    eventCount, publishedCount, pastCount,
    ticketCount, revenueAgg,
    refundsPending,
    users, recentEvents, recentLogs
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ORGANIZER" } }),
    prisma.user.count({ where: { role: "ATTENDEE"  } }),
    prisma.event.count(),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { status: "PAST" } }),
    prisma.ticket.count(),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { totalCents: true } }),
    prisma.refundRequest.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" }, take: 50,
      select: {
        id: true, name: true, email: true, image: true,
        role: true, status: true
      }
    }),
    prisma.event.findMany({
      orderBy: { createdAt: "desc" }, take: 30,
      select: {
        id: true, slug: true, title: true, status: true, featured: true,
        bannerUrl: true, startsAt: true,
        organizer: { select: { name: true } }
      }
    }),
    prisma.moderationLog.findMany({
      orderBy: { createdAt: "desc" }, take: 20,
      include: { admin: { select: { name: true } } }
    })
  ]);

  const grossRevenue = revenueAgg._sum.totalCents ?? 0;

  return (
    <div className="w-full">
      <DashboardHero
        tone="hibiscus"
        eyebrow="Platform · Admin"
        title="Everyone, every event,"
        accent="every dollar."
        lede="The whole platform from one place. KPIs are organisation-wide. Use the action menus to suspend, feature, or unpublish — every move is logged."
        ctas={[
          { label: "Open dashboard", href: "/dashboard", variant: "primary" }
        ]}
        kpi={{
          label:   "Pending refunds",
          value:   refundsPending.toLocaleString(),
          caption: refundsPending > 0 ? "Action required" : "Inbox empty"
        }}
      />

      {/* ─── Platform KPIs ───
            Every card is a link into the corresponding data surface so
            an admin can drill from a number on the overview straight
            into the underlying records. Each tile carries a caption so
            heights stay uniform across the grid row — `items-stretch`
            on the grid + `h-full` on the wrapping link belt+suspender
            this for any tile whose caption is shorter. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
        <KpiLink href="/admin?tab=users">
          <Stat label="Users"           value={userCount.toLocaleString()}
                caption={`${organizerCount} organizers · ${attendeeCount} attendees`} />
        </KpiLink>
        <KpiLink href="/admin?tab=events">
          <Stat label="Events"          value={eventCount.toLocaleString()}
                caption={`${publishedCount} live · ${pastCount} past`} />
        </KpiLink>
        <KpiLink href="/dashboard/orders">
          <Stat label="Tickets issued"  value={ticketCount.toLocaleString()} tone="acacia"
                caption="Across all events" />
        </KpiLink>
        <KpiLink href="/dashboard/finance">
          <Stat label="Gross revenue"   value={formatPrice(grossRevenue, "USD")} tone="gold"
                caption="All-time, all currencies, USD-equivalent" />
        </KpiLink>
      </section>

      {/* ─── Users / Events tabbed browser ───
            One container, two tabs, one shared search input. Both lists
            use the same column widths so the right-anchored Actions
            lane sits on a perfectly straight vertical line whether
            you're viewing Users or Events. */}
      <AdminBrowser
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          role: u.role,
          status: u.status
        }))}
        events={recentEvents.map((e) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
          status: e.status,
          featured: e.featured,
          bannerUrl: e.bannerUrl,
          startsAt: e.startsAt.toISOString(),
          organizerName: e.organizer.name ?? null
        }))}
      />

      {/* ─── Moderation log ─── */}
      <section>
        <header className="mb-4 flex items-baseline justify-between gap-3 px-1">
          <h2 className="font-display text-[20px] font-bold text-nile-900 tracking-tight">
            Moderation log
          </h2>
          <p className="text-[12.5px] text-ink-500">Newest 20 admin actions.</p>
        </header>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[color:var(--border-hairline)] overflow-hidden">
          {recentLogs.length === 0 ? (
            <div className="px-5 sm:px-6 py-10 text-center text-[13.5px] text-ink-500">
              No actions yet.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--border-hairline)] text-[13px]">
              {recentLogs.map((l) => (
                <li key={l.id} className="flex items-start gap-4 px-5 sm:px-6 py-3.5 text-ink-700 hover:bg-cream-50/50 motion-safe:transition-colors">
                  <span className="w-40 shrink-0 hidden sm:block font-tabular text-[11.5px] text-ink-500">
                    {l.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </span>
                  <span className="min-w-0 flex-1 leading-relaxed">
                    <strong className="text-nile-900">{l.action}</strong>
                    {" on "}
                    {targetHref(l.action, l.targetId) ? (
                      <Link
                        href={targetHref(l.action, l.targetId)!}
                        className="rounded bg-cream-100 px-1.5 py-0.5 text-[11.5px] font-tabular text-nile hover:bg-nile-50 hover:underline"
                      >
                        {l.targetId.slice(0, 12)}
                      </Link>
                    ) : (
                      <code className="rounded bg-cream-100 px-1.5 py-0.5 text-[11.5px] font-tabular">
                        {l.targetId.slice(0, 12)}
                      </code>
                    )}
                    {" by "}
                    <span className="font-semibold text-ink-900">{l.admin.name ?? "—"}</span>
                    {l.reason && <span className="text-ink-500"> · {l.reason}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

/** Wraps a Stat card in a link so the whole tile is clickable into the
 *  underlying data surface. Forwards keyboard focus + a subtle hover
 *  treatment so the card reads as interactive. */
function KpiLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block h-full rounded-2xl motion-safe:transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile/40 [&>div]:h-full"
    >
      {children}
    </Link>
  );
}

/** Best-effort link target for a moderation-log entry. The schema
 *  doesn't store a separate `targetType`, so we infer it from the
 *  action verb (e.g. "suspend_user" → /organizer/<id>; "unlist_event"
 *  → /dashboard/events/<id>). Unknown actions fall back to plain
 *  monospace text. */
function targetHref(action: string, targetId: string): string | null {
  const a = action.toLowerCase();
  if (a.includes("user") || a.includes("organizer")) return `/organizer/${targetId}`;
  if (a.includes("event"))                            return `/dashboard/events/${targetId}`;
  return null;
}
