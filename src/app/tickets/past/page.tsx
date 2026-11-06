import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLACEHOLDER_BANNER } from "@/lib/stock-photos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Past orders" };

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
const dayFmt   = new Intl.DateTimeFormat("en-US", { day: "numeric" });
const dateFmt  = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const timeFmt  = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * /tickets/past — every order whose event has already ended. Linked
 * from the "See past orders" CTA below the upcoming list on /tickets.
 * Layout mirrors the upcoming list so the row pattern stays familiar.
 */
export default async function PastTicketsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/tickets/past");

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      status: "PAID",
      // Only orders whose event has already ended belong here.
      event: { endsAt: { lt: new Date() } }
    },
    include: {
      event: { select: {
        id: true, slug: true, title: true, startsAt: true, endsAt: true,
        bannerUrl: true, city: true, country: true, venueName: true
      } },
      tickets: { select: { id: true, status: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20">
      {/* Breadcrumb back to /tickets — keeps users from feeling stranded */}
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-nile hover:underline"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 6l-6 6 6 6" />
        </svg>
        All orders
      </Link>

      <header className="mt-4 mb-10">
        <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
          Past orders
        </h1>
        <p className="mt-2 text-[14px] text-ink-600">
          Receipts and proof of attendance from events you&rsquo;ve already been to. Tap a
          row to open the printable ticket.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-hairline)] bg-white p-10 text-center shadow-sm">
          <h2 className="font-display text-[18px] font-bold text-nile-900">No past orders yet</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-600 max-w-md mx-auto">
            Orders for events that have already ended will appear here.
          </p>
          <Link href="/tickets" className="btn btn-primary mt-5">Back to tickets</Link>
        </div>
      ) : (
        <ul className="space-y-7">
          {orders.map((o) => {
            const banner   = o.event.bannerUrl || PLACEHOLDER_BANNER;
            const orderRef = o.id.slice(-10).toUpperCase();
            const isFree   = o.totalCents === 0;
            const firstTicketId = o.tickets[0]?.id;
            const linkHref = firstTicketId ? `/tickets/${firstTicketId}` : `/events/${o.event.slug}`;

            return (
              <li key={o.id}>
                <Link
                  href={linkHref}
                  className="group flex items-stretch gap-4 sm:gap-5 opacity-90 hover:opacity-100 motion-safe:transition-opacity"
                  aria-label={`Open ticket for ${o.event.title}`}
                >
                  <div className="shrink-0 pt-1 text-center w-12">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
                      {monthFmt.format(o.event.startsAt)}
                    </div>
                    <div className="font-display text-[28px] font-extrabold text-ink-700 leading-none mt-1">
                      {dayFmt.format(o.event.startsAt)}
                    </div>
                  </div>

                  <div className="relative h-32 sm:h-36 w-44 sm:w-64 shrink-0 overflow-hidden rounded-md bg-nile-50 ring-1 ring-[color:var(--border-hairline)]">
                    <Image
                      src={banner}
                      alt=""
                      fill
                      sizes="(max-width:640px) 176px, 256px"
                      className="object-cover grayscale-[0.15] motion-safe:transition-transform group-hover:scale-[1.02]"
                    />
                  </div>

                  <div className="min-w-0 flex-1 self-center">
                    <h3 className="font-display text-[18px] sm:text-[20px] font-bold text-nile-900 tracking-tight leading-snug line-clamp-2 group-hover:text-nile">
                      {o.event.title}
                    </h3>
                    <div className="mt-1.5 text-[13px] text-ink-600 font-tabular">
                      {dateFmt.format(o.event.startsAt)}, {timeFmt.format(o.event.startsAt)}
                    </div>
                    <div className="mt-1.5 text-[13px] text-ink-600">
                      {isFree ? "Free order" : "Order"} #{orderRef} · placed {dateFmt.format(o.createdAt)}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
