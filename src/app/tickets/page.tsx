import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLACEHOLDER_BANNER } from "@/lib/stock-photos";

export const dynamic = "force-dynamic";

type SP = { orderId?: string; demo?: string };

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
const dayFmt   = new Intl.DateTimeFormat("en-US", { day: "numeric" });
const dateFmt  = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFmt  = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const placedTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export default async function MyTicketsPage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/tickets");

  const userId = session.user.id;

  const [user, orders, counts] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        name: true, email: true, image: true, emailVerified: true,
        interests: true
      }
    }),
    prisma.order.findMany({
      where: {
        userId,
        // PAID orders carry tickets — PENDING/FAILED never produce them.
        status: "PAID"
      },
      include: {
        event: { select: {
          id: true, slug: true, title: true, startsAt: true, endsAt: true,
          bannerUrl: true, city: true, country: true, venueName: true
        } },
        tickets: { select: { id: true, status: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    Promise.all([
      prisma.order.count({ where: { userId, status: "PAID" } }),
      prisma.like.count({ where: { userId } }),
      prisma.follow.count({ where: { followerId: userId } })
    ])
  ]);

  const [orderCount, likeCount, followingCount] = counts;
  const now = new Date();
  const upcoming = orders.filter((o) => o.event.endsAt >= now);
  const past     = orders.filter((o) => o.event.endsAt <  now);

  const justPurchasedOrderId = searchParams?.orderId?.slice(0, 40) ?? null;
  const justPurchased = justPurchasedOrderId
    ? orders.find((o) => o.id === justPurchasedOrderId) ?? null
    : null;

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Your profile";
  const isVerified = !!user?.emailVerified;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20">
      {/* ─── Profile header ─── */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 pb-12 border-b border-[color:var(--border-hairline)]">
        <div className="relative h-32 w-32 sm:h-40 sm:w-40 shrink-0 rounded-full ring-1 ring-[color:var(--border-hairline)] bg-white overflow-hidden">
          {user?.image ? (
            <Image
              src={user.image}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-ink-400">
              <svg viewBox="0 0 24 24" className="h-16 w-16 sm:h-20 sm:w-20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="9" r="3.5" />
                <path d="M5 20a7 7 0 0114 0" />
              </svg>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] sm:text-[36px] font-extrabold text-nile-900 tracking-tight leading-[1.05] truncate">
              {displayName}
            </h1>
            <Link
              href="/account"
              aria-label="Edit profile"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-nile-50 hover:text-nile motion-safe:transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </Link>
          </div>

          {/* Stats row — every count is a link. Orders jumps down to the
              section on this page; Likes / Following deep-link to their
              own list pages so the user can drill in. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-ink-700">
            <Link href="#orders" scroll className="hover:underline">
              <CountStat n={orderCount}     one="order"    many="orders" />
            </Link>
            <Dot />
            <Link href="/liked" className="hover:underline">
              <CountStat n={likeCount}      one="like"     many="likes" />
            </Link>
            <Dot />
            <Link href="/following" className="hover:underline">
              <CountStat n={followingCount} one="following" many="following" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Just-purchased banner (kept compact) ─── */}
      {justPurchased && (
        <div
          role="status"
          className="mt-8 rounded-2xl bg-acacia-50 px-5 py-4 flex items-start gap-4 shadow-sm ring-1 ring-acacia-500/15"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acacia text-white" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-bold text-acacia-600">Order confirmed.</div>
            <div className="mt-1 text-[13px] text-ink-700 leading-relaxed">
              Your tickets for{" "}
              <Link href={`/events/${justPurchased.event.slug}`} className="text-nile font-semibold hover:underline">
                {justPurchased.event.title}
              </Link>{" "}
              are below. We&rsquo;ve also emailed a copy.
            </div>
          </div>
        </div>
      )}

      {/* ─── Orders ─── */}
      <section id="orders" className="mt-14 grid gap-10 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-16 scroll-mt-24">
        <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-nile-900 tracking-tight">
          Orders
        </h2>

        <div className="min-w-0">
          {/* Email-verification CTA — only when the user hasn't confirmed
              their email yet. Acts as a "Can't find your tickets?" recovery
              prompt. Hides itself once verified. */}
          {!isVerified && (
            <div className="text-center mb-12">
              <div className="font-display text-[20px] sm:text-[22px] font-bold text-nile-900 tracking-tight">
                Looking for your tickets?
              </div>
              <p className="mt-2 text-[14px] text-ink-600">
                You need to verify your email to view transfers and gifts.
              </p>
              <Link
                href="/account/verify-email"
                className="inline-flex items-center justify-center rounded-md border border-ink-400/40 bg-white px-5 py-2.5 mt-4 text-[14px] font-semibold text-nile-900 hover:border-nile/60 hover:bg-nile-50 motion-safe:transition-colors"
              >
                Verify your email
              </Link>
            </div>
          )}

          {/* Empty state */}
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border-hairline)] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-nile-50 text-nile">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 9a2 2 0 002 2h.01a2 2 0 010 4H6a2 2 0 00-2 2v1a2 2 0 002 2h12a2 2 0 002-2v-1a2 2 0 00-2-2h-.01a2 2 0 010-4H18a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v1z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-[18px] font-bold text-nile-900">No orders yet</h3>
              <p className="mt-1.5 text-[13.5px] text-ink-600 max-w-md mx-auto">
                Once you grab a ticket to a community event, the order shows up here.
              </p>
              <Link href="/browse" className="btn btn-primary mt-5">Browse events</Link>
            </div>
          ) : (
            <div className="space-y-7">
              {upcoming.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}

              {past.length > 0 && (
                <div className="pt-6 text-center">
                  <Link href="/tickets/past" className="text-[14px] font-semibold text-nile hover:underline">
                    See past orders
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Interests ─── */}
      <section className="mt-16 pt-10 border-t border-[color:var(--border-hairline)] grid gap-10 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-16">
        <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-nile-900 tracking-tight">
          Interests
        </h2>
        <div>
          <Link
            href="/interests"
            className="group flex items-center justify-between gap-4 rounded-lg ring-1 ring-[color:var(--border-hairline)] px-5 py-4 hover:ring-nile/30 motion-safe:transition-shadow"
          >
            <div className="min-w-0">
              <div className="font-semibold text-ink-900 text-[14.5px]">
                {(user?.interests?.length ?? 0) > 0
                  ? `${user!.interests.length} categories you follow`
                  : "Pick the categories you care about"}
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                We&apos;ll surface events that match — concerts, weddings, fundraisers, more.
              </p>
            </div>
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-500 group-hover:text-nile motion-safe:transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Demo banner — only when the post-checkout query carries demo=1 */}
      {justPurchased && searchParams?.demo === "1" && (
        <div className="mt-10 rounded-2xl bg-gold-50 px-5 py-4 ring-1 ring-gold-100 text-[13px] text-ink-700">
          <span className="font-bold text-nile-900">Demo purchase</span> — no real money was charged.
          Your tickets are real in the database so you can exercise the flow, but no payment
          was processed.
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function Dot() {
  return <span aria-hidden className="text-ink-400">·</span>;
}

function CountStat({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <span>
      <span className="font-tabular font-semibold text-ink-900">{n.toLocaleString()}</span>{" "}
      <span className="text-ink-600">{n === 1 ? one : many}</span>
    </span>
  );
}

type OrderForRow = {
  id: string;
  createdAt: Date;
  totalCents: number;
  currency: string;
  event: {
    id: string;
    slug: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    bannerUrl: string | null;
    city: string | null;
    country: string | null;
    venueName: string | null;
  };
  tickets: { id: string; status: string }[];
};

function OrderRow({ order }: { order: OrderForRow }) {
  const banner = order.event.bannerUrl || PLACEHOLDER_BANNER;
  const isFree = order.totalCents === 0;
  const orderRef = order.id.slice(-10).toUpperCase();
  const placedSameDay = isToday(order.createdAt);
  const placedDate = placedSameDay
    ? `Today at ${placedTime.format(order.createdAt)}`
    : dateFmt.format(order.createdAt);

  // First active ticket — clicking the row jumps straight to the
  // printable ticket detail page. If the order has multiple, the user
  // can navigate between them from there.
  const firstTicketId = order.tickets[0]?.id;
  const linkHref = firstTicketId ? `/tickets/${firstTicketId}` : `/events/${order.event.slug}`;

  return (
    <Link
      href={linkHref}
      className="group flex items-stretch gap-4 sm:gap-5"
      aria-label={`Open ticket for ${order.event.title}`}
    >
      {/* MAY/15 strip */}
      <div className="shrink-0 pt-1 text-center w-12">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-hibiscus">
          {monthFmt.format(order.event.startsAt)}
        </div>
        <div className="font-display text-[28px] font-extrabold text-ink-700 leading-none mt-1">
          {dayFmt.format(order.event.startsAt)}
        </div>
      </div>

      {/* Banner — fixed aspect, clicking lands on ticket detail */}
      <div className="relative h-32 sm:h-36 w-44 sm:w-64 shrink-0 overflow-hidden rounded-md bg-nile-50 ring-1 ring-[color:var(--border-hairline)]">
        <Image
          src={banner}
          alt=""
          fill
          sizes="(max-width:640px) 176px, 256px"
          className="object-cover motion-safe:transition-transform group-hover:scale-[1.02]"
        />
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1 self-center">
        <h3 className="font-display text-[18px] sm:text-[20px] font-bold text-nile-900 tracking-tight leading-snug line-clamp-2 group-hover:text-nile">
          {order.event.title}
        </h3>
        <div className="mt-1.5 text-[13px] text-ink-600 font-tabular">
          {dateFmt.format(order.event.startsAt)}, {timeFmt.format(order.event.startsAt)}
        </div>
        <div className="mt-1.5 text-[13px] text-ink-600">
          {isFree ? "Free order" : "Order"} #{orderRef} placed on {placedDate}
        </div>
      </div>
    </Link>
  );
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth()    === now.getMonth()
      && d.getDate()     === now.getDate();
}
