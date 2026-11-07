import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { BRAND_NAME, BRAND_STATEMENT_DESCRIPTOR, brandEmail } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers for attendees and organizers — tickets, refunds, creating events, payouts, and more."
};

type SP = { view?: string };

type FaqItem = { q: string; a: React.ReactNode };
type FaqGroup = { title: string; icon: React.ReactNode; items: FaqItem[] };

/* ──────────────────────────────────────────
   Attending an event
   ────────────────────────────────────────── */
const ATTENDING: FaqGroup[] = [
  {
    title: "Finding & attending events",
    icon: <IconSearch />,
    items: [
      { q: "How do I find an event?",
        a: <>Use the search bar at the top of any page, or head to <Link href="/browse" className="text-nile hover:underline">Events</Link> to filter by city, category, format, price, and date.</> },
      { q: "Can I buy a ticket without creating an account?",
        a: <>No — tickets are tied to an email address so we can send your confirmation and QR code. Sign-up takes under a minute.</> },
      { q: "Where do I find tickets I've already bought?",
        a: <>Sign in and go to <Link href="/tickets" className="text-nile hover:underline">My tickets</Link>. You can also show the QR code directly from your confirmation email.</> },
      { q: "An event I want is sold out — what now?",
        a: <>Use the <strong>Join Waitlist</strong> button on the event page. We&rsquo;ll email you if more tickets are released, in the order people signed up.</> }
    ]
  },
  {
    title: "Payments, refunds & transfers",
    icon: <IconRefund />,
    items: [
      { q: "How do refunds work?",
        a: <>Refunds follow the organizer&rsquo;s posted policy, shown on every event page. If an event is cancelled, attendees receive a full refund automatically within 5–10 business days.</> },
      { q: "Can I transfer my ticket to someone else?",
        a: <>If the organizer has enabled transfers, yes — open the ticket from <Link href="/tickets" className="text-nile hover:underline">My tickets</Link> and use <strong>Transfer</strong>. Otherwise, contact the organizer from the event page.</> },
      { q: "My mobile money / card didn't work.",
        a: <>Try another payment method in checkout. If the issue persists, email <a className="text-nile hover:underline" href={`mailto:${brandEmail("help")}`}>{brandEmail("help")}</a>.</> },
      { q: "What does this charge on my statement mean?",
        a: <>Charges from {BRAND_NAME} appear as <code className="font-mono-ed">{BRAND_STATEMENT_DESCRIPTOR}</code>. Each one maps to a ticket order shown under <Link href="/tickets" className="text-nile hover:underline">My tickets</Link>.</> }
    ]
  },
  {
    title: "Account & privacy",
    icon: <IconUser />,
    items: [
      { q: "How do I change my password or email?",
        a: <>Go to <Link href="/dashboard/settings" className="text-nile hover:underline">Settings</Link>. You&rsquo;ll be asked to confirm with your current password.</> },
      { q: "Who can see my profile?",
        a: <>Your name, community or heritage (if set), and events you organize are public. Your email and ticket history are private.</> },
      { q: "How do I delete my account?",
        a: <>Email <a className="text-nile hover:underline" href={`mailto:${brandEmail("help")}`}>{brandEmail("help")}</a> from the address on file and we&rsquo;ll remove your account within 7 days.</> }
    ]
  }
];

/* ──────────────────────────────────────────
   Organizing an event
   ────────────────────────────────────────── */
const ORGANIZING: FaqGroup[] = [
  {
    title: "Creating & hosting events",
    icon: <IconPlus />,
    items: [
      { q: "How do I create an event?",
        a: <>Sign in, click <strong>Create event</strong> in the header or on your <Link href="/dashboard" className="text-nile hover:underline">dashboard</Link>, fill in the basics, add ticket tiers, choose who can see it, and publish. Drafts save automatically.</> },
      { q: "What does \"Community visibility\" do?",
        a: <>You can open your event to everyone, to specific communities you name, or to your own community only. Anyone outside the chosen audience won&rsquo;t see the event in search or on home.</> },
      { q: "Can I edit an event after publishing?",
        a: <>Yes. Open the event from <Link href="/dashboard/events" className="text-nile hover:underline">Dashboard → Events</Link>. Changing date or location notifies existing attendees.</> },
      { q: "Can I sell recurring or multi-date events?",
        a: <>Recurring dates launch later this year. In the meantime, publish each occurrence as its own event and link them from a shared description.</> }
    ]
  },
  {
    title: "Fees & payouts",
    icon: <IconBank />,
    items: [
      { q: "What are your fees?",
        a: <>Free events are free to publish. Paid events are 2.9% + $0.50 on cards and 2.5% + $0.25 on mobile money. See <Link href="/pricing" className="text-nile hover:underline">Pricing</Link>.</> },
      { q: "When do organizers get paid?",
        a: <>Payouts run 2 business days after each event ends, to the bank account or mobile-money number on file in <Link href="/dashboard/finance" className="text-nile hover:underline">Finance</Link>.</> },
      { q: "Can attendees pay the fee instead of me?",
        a: <>Yes. Go to <Link href="/dashboard/settings?tab=fees" className="text-nile hover:underline">Settings → Ticket Fees</Link> and choose <em>Pass fees to attendees</em>.</> }
    ]
  },
  {
    title: "Promoting & growing",
    icon: <IconMegaphone />,
    items: [
      { q: "How do I share my event?",
        a: <>Every event page has a share row with short-links and native share. Use the <Link href="/dashboard/marketing" className="text-nile hover:underline">Marketing</Link> tab for templated emails and social posts.</> },
      { q: "How do people find my event organically?",
        a: <>We surface events in the city and category pages, and in the personalized &ldquo;For you&rdquo; feed on the home page. Complete your organizer profile so you rank higher.</> }
    ]
  }
];

export default async function HelpPage({ searchParams }: { searchParams?: SP }) {
  const view: "attending" | "organizing" =
    searchParams?.view === "organizing" ? "organizing" : "attending";
  const groups = view === "attending" ? ATTENDING : ORGANIZING;

  // My tickets card — personal snapshot when signed in, friendly empty when not.
  const session = await auth();
  const upcomingTickets = session?.user?.id
    ? await prisma.ticket.findMany({
        where: {
          userId: session.user.id,
          status: { in: ["ISSUED", "CHECKED_IN"] },
          event: { endsAt: { gte: new Date() } }
        },
        include: { event: { select: { title: true, slug: true, startsAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 2
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-10 sm:pb-14 lg:pb-16">
      {/* Hero */}
      <div className="text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">Help center</div>
        <h1 className="mt-2 font-display text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-nile-900 tracking-tight leading-[1.05]">
          How can we help?
        </h1>
        <p className="mt-3 text-ink-600 max-w-xl mx-auto">
          Search a question, or pick a section below.
        </p>

        {/* Search (hits /browse q param for now; scoped help-search later) */}
        <form
          action="/browse"
          className="mt-6 mx-auto flex h-12 max-w-xl items-center gap-2 rounded-full bg-white pl-4 pr-1 shadow-card focus-within:ring-4 focus-within:ring-nile/30"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            name="q"
            placeholder="Search help articles"
            className="flex-1 bg-transparent text-[15px] placeholder:text-ink-500 focus:outline-none"
          />
          <button type="submit" className="btn btn-primary rounded-full">Search</button>
        </form>
      </div>

      {/* Attending / Organizing tabs */}
      <div className="mt-10 flex justify-center border-b border-[color:var(--border-hairline)]">
        <TabLink active={view === "attending"}  href="/help?view=attending">Attending an event</TabLink>
        <TabLink active={view === "organizing"} href="/help?view=organizing">Organizing an event</TabLink>
      </div>

      {/* My tickets / Start hosting card — audience-aware */}
      <div className="mt-8">
        {view === "attending" ? (
          <MyTicketsCard
            signedIn={Boolean(session?.user?.id)}
            tickets={upcomingTickets}
          />
        ) : (
          <HostingCard />
        )}
      </div>

      {/* FAQ groups */}
      <div className="mt-12 space-y-10">
        {groups.map((g) => (
          <section key={g.title}>
            <div className="flex items-center gap-2">
              {g.icon}
              <h2 className="font-display text-[20px] font-bold text-nile-900">{g.title}</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {g.items.map((it) => (
                <details key={it.q} className="card p-4">
                  <summary className="font-semibold cursor-pointer text-ink flex items-center justify-between gap-3 list-none">
                    <span>{it.q}</span>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="mt-3 text-ink text-[15px] leading-relaxed">{it.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Contact CTA */}
      <div className="mt-14 card p-6 sm:p-8 text-center">
        <h2 className="font-display text-[22px] font-bold text-nile-900">Didn&rsquo;t find what you were looking for?</h2>
        <p className="mt-2 text-ink-600">Our support team reads every message. We reply within one business day.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn btn-primary">Contact support</Link>
          <a href={`mailto:${brandEmail("help")}`} className="btn btn-ghost">{brandEmail("help")}</a>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Pieces
   ────────────────────────────────────────── */

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={
        "px-6 py-3 -mb-px border-b-2 text-[15px] font-semibold transition " +
        (active
          ? "border-nile text-nile"
          : "border-transparent text-ink-600 hover:text-nile")
      }
    >
      {children}
    </Link>
  );
}

function MyTicketsCard({
  signedIn, tickets
}: {
  signedIn: boolean;
  tickets: Array<{ id: string; code: string; event: { title: string; slug: string; startsAt: Date } }>;
}) {
  return (
    <div className="card p-6 sm:p-8">
      <h3 className="font-display text-[20px] font-bold text-nile-900">My tickets</h3>

      {!signedIn ? (
        <>
          <div className="mt-4 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-nile-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-nile/70" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 9v6a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                <path d="M8 7v10M16 7v10" />
              </svg>
            </div>
            <p className="mt-3 text-sm text-ink-600">Sign in to see your orders and tickets.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/sign-in?callbackUrl=/tickets" className="btn btn-primary">Find my tickets</Link>
              <Link href="/browse" className="btn btn-ghost">Browse events</Link>
            </div>
          </div>
        </>
      ) : tickets.length === 0 ? (
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-nile-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-nile/70" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 9v6a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
              <path d="M8 7v10M16 7v10" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-ink-600">No upcoming orders.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/tickets" className="btn btn-primary">View past orders</Link>
            <Link href="/browse" className="btn btn-ghost">Browse events</Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-[color:var(--border-hairline)]">
            {tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/events/${t.event.slug}`} className="font-semibold text-ink hover:text-nile truncate inline-block max-w-full">
                    {t.event.title}
                  </Link>
                  <div className="text-[13px] text-ink-500">{formatDate(t.event.startsAt)}</div>
                </div>
                <Link href={`/tickets/${t.id}`} className="btn btn-ghost shrink-0">View ticket</Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link href="/tickets" className="text-sm font-semibold text-nile hover:underline">
              View all tickets →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function HostingCard() {
  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-[20px] font-bold text-nile-900">Start hosting</h3>
          <p className="mt-1 text-sm text-ink-600 max-w-md">
            Publish a free or paid event in under five minutes. Cards, mobile money,
            QR check-in, and a community page — all included.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/events/new" className="btn btn-primary">Create event</Link>
          <Link href="/dashboard" className="btn btn-ghost">Go to dashboard</Link>
        </div>
      </div>
    </div>
  );
}

/* ─────── Tiny icons ─────── */
function IconSearch()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-nile" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>; }
function IconRefund()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-nile" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 12a9 9 0 019-9v4" /><path d="M21 12a9 9 0 01-9 9v-4" /><path d="M8 7L3 3v5M16 17l5 4v-5" /></svg>; }
function IconUser()      { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-nile" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>; }
function IconPlus()      { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-nile" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>; }
function IconBank()      { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-nile" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" /></svg>; }
function IconMegaphone() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-nile" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 10v4h4l10 5V5L7 10H3z" /><path d="M17 9a3 3 0 010 6" /></svg>; }
