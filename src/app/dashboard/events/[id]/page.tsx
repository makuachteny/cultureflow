import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/utils";
import Stat from "@/components/ui/Stat";

export const dynamic = "force-dynamic";

export default async function EventManagePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return notFound();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      tickets: { include: { tier: true, user: true }, orderBy: { createdAt: "desc" }, take: 200 },
      ticketTiers: true,
      _count: { select: { tickets: true, comments: true } }
    }
  });
  if (!event) return notFound();
  if (event.organizerId !== session.user.id && session.user.role !== "ADMIN") return notFound();

  const totalRevenue = await prisma.order.aggregate({
    where: { eventId: event.id, status: "PAID" },
    _sum: { totalCents: true }
  });

  const statusTone =
    event.status === "PUBLISHED" ? "text-acacia-600" :
    event.status === "DRAFT"     ? "text-gold-700"   :
    event.status === "CANCELLED" ? "text-hibiscus"   :
    "text-ink-600";

  return (
    <div className="w-full">
      <Link href="/dashboard" className="text-[13px] font-semibold text-ink-600 hover:text-nile-900 inline-flex items-center gap-1">
        <span aria-hidden>‹</span> Dashboard
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
            Event details
          </div>
          <h1 className="mt-1 font-display text-[28px] sm:text-[34px] font-extrabold text-nile-900 tracking-tight leading-[1.1]">
            {event.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-600">
            <span>{formatDate(event.startsAt)}</span>
            <span aria-hidden>·</span>
            <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${statusTone}`}>
              {event.status}
            </span>
            {event.ticketTiers.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{event.ticketTiers.length} {event.ticketTiers.length === 1 ? "tier" : "tiers"}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`/events/${event.slug}`}
            className="btn btn-outline btn-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public page
          </Link>
          <Link href={`/dashboard/events/${event.id}/check-in`} className="btn btn-primary btn-sm">
            Check-in
          </Link>
        </div>
      </header>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        <Stat label="Tickets sold" value={`${event._count.tickets}`} />
        <Stat label="Revenue"      value={formatPrice(totalRevenue._sum.totalCents ?? 0, "USD")} />
        <Stat label="Comments"     value={`${event._count.comments}`} />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-nile-900 tracking-tight">
            Attendees
          </h2>
          <span className="text-[12px] text-ink-500">
            {event.tickets.length} of {event._count.tickets}
          </span>
        </div>
        <div className="card p-0 mt-4 overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead className="bg-nile-50 text-nile">
              <tr>
                <th className="text-left p-3 font-semibold">Name</th>
                <th className="text-left p-3 font-semibold">Email</th>
                <th className="text-left p-3 font-semibold">Tier</th>
                <th className="text-left p-3 font-semibold">Code</th>
                <th className="text-left p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {event.tickets.map((t) => (
                <tr key={t.id} className="border-t border-[color:var(--border-hairline)]">
                  <td className="p-3 text-ink-900">{t.attendeeName}</td>
                  <td className="p-3 text-ink-700">{t.attendeeEmail}</td>
                  <td className="p-3 text-ink-700">{t.tier.name}</td>
                  <td className="p-3 font-tabular text-ink-700">{t.code}</td>
                  <td className="p-3 text-ink-700">{t.status}</td>
                </tr>
              ))}
              {event.tickets.length === 0 && (
                <tr><td colSpan={5} className="p-5 text-center text-[14px] text-ink-500">No tickets yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

