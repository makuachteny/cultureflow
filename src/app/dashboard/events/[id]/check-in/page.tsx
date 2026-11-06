import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import CheckInClient from "./CheckInClient";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: { id: string } }) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) {
    redirect(`/sign-in?callbackUrl=/dashboard/events/${params.id}/check-in`);
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: {
      id: true, slug: true, title: true, organizerId: true,
      startsAt: true, endsAt: true, venueName: true, city: true,
      _count: { select: { tickets: true } }
    }
  });
  if (!event) return notFound();

  const isOwner = event.organizerId === gate.userId;
  const isAdmin = gate.role === "ADMIN";
  if (!isOwner && !isAdmin) return notFound();

  const checkedInCount = await prisma.ticket.count({
    where: { eventId: event.id, status: "CHECKED_IN" }
  });
  const totalTickets = event._count.tickets;
  const remaining    = Math.max(0, totalTickets - checkedInCount);
  const pct          = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <header>
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-[13px] font-semibold text-ink-600 hover:text-nile-900 inline-flex items-center gap-1"
        >
          <span aria-hidden>‹</span> Back to event
        </Link>
        <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
          Live check-in
        </div>
        <h1 className="mt-1 font-display text-[28px] sm:text-[34px] font-extrabold tracking-tight text-nile-900">
          {event.title}
        </h1>
        <p className="mt-2 text-[14px] text-ink-600">
          {new Date(event.startsAt).toLocaleString("en-US", {
            weekday: "long", month: "long", day: "numeric",
            hour: "numeric", minute: "2-digit"
          })}
          {event.venueName ? ` · ${event.venueName}` : ""}
          {event.city     ? ` · ${event.city}`     : ""}
        </p>
      </header>

      {/* ─── Progress strip — 3 stat tiles + a slim progress bar ─── */}
      <section className="rounded-md bg-white shadow-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[color:var(--border-hairline)]">
          <Stat label="Checked in" value={checkedInCount} tone="acacia" />
          <Stat label="Remaining"  value={remaining}      tone="ink" />
          <Stat label="Progress"   value={`${pct}%`}      tone="gold" />
        </div>
        <div className="h-2 bg-cream-100">
          <div
            className="h-full bg-acacia transition-[width] duration-500"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
      </section>

      {/* ─── Scanner + manual code entry ─── */}
      <section className="rounded-md bg-white shadow-card p-5 sm:p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Scanner
        </div>
        <h2 className="mt-1 font-display text-[18px] font-bold text-nile-900">
          Scan a ticket QR or enter the 6-character code
        </h2>
        <p className="mt-1 text-[13px] text-ink-600">
          Each ticket can be checked in once. Already-checked-in codes return a
          friendly &quot;already in&quot; status without rejecting the buyer.
        </p>
        <div className="mt-5">
          <CheckInClient eventId={event.id} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label, value, tone
}: {
  label: string;
  value: string | number;
  tone:  "acacia" | "ink" | "gold";
}) {
  const valueClass =
    tone === "acacia" ? "text-acacia-600" :
    tone === "gold"   ? "text-gold-700"   :
    "text-nile-900";
  return (
    <div className="px-4 sm:px-5 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </div>
      <div className={`mt-1 font-display text-[26px] sm:text-[28px] font-extrabold font-tabular ${valueClass}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
