import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardHero from "@/components/organizer/DashboardHero";
import Stat from "@/components/ui/Stat";
import ShareKit, { type ShareEvent } from "@/components/organizer/marketing/ShareKit";
import { BRAND_NAME } from "@/lib/brand";
import WhatsAppKit from "@/components/organizer/marketing/WhatsAppKit";
import EmailAudience from "@/components/organizer/marketing/EmailAudience";

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────
   Marketing tools — tabbed hub. All seven tabs render real
   content; the ones still waiting on backend integrations
   (Paid Ads, Promos) are honest informational pages that point
   organizers to the working workarounds.
   ───────────────────────────────────────────────────────────── */

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "email",     label: "Email Campaigns" },
  { key: "social",    label: "Social Media" },
  { key: "ads",       label: "Paid Social Ads" },
  { key: "whatsapp",  label: "WhatsApp Groups" },
  { key: "promos",    label: "Promotions" },
  { key: "settings",  label: "Settings" }
] as const;
type TabKey = (typeof TABS)[number]["key"];

const TAGLINE_COOKIE = "ssd_mkt_tagline";
const DEFAULT_TAGLINE = `See you there — posted via ${BRAND_NAME}`;

async function updateMarketingSettings(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/marketing?tab=settings");

  const raw = String(formData.get("tagline") ?? "").trim().slice(0, 200);
  const tagline = raw || DEFAULT_TAGLINE;
  cookies().set(TAGLINE_COOKIE, tagline, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
  revalidatePath("/dashboard/marketing");
  redirect("/dashboard/marketing?tab=settings&saved=1");
}

type SP = { tab?: string; saved?: string };

export default async function MarketingPage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/marketing");

  const rawTab = searchParams?.tab;
  const activeTab: TabKey = rawTab && TABS.some((t) => t.key === rawTab)
    ? (rawTab as TabKey)
    : "dashboard";
  const saved = searchParams?.saved === "1";

  // Glance KPIs — number of upcoming events as the headline number, plus
  // the organizer's follower count to suggest reach potential.
  const [upcomingCount, followerCount] = await Promise.all([
    prisma.event.count({
      where: {
        organizerId: session.user.id,
        status: "PUBLISHED",
        startsAt: { gte: new Date() }
      }
    }),
    prisma.follow.count({ where: { followingId: session.user.id } })
  ]);

  return (
    <div className="w-full">
      <DashboardHero
        tone="acacia"
        eyebrow="Grow"
        title="Reach your tribe,"
        accent="fill the room."
        lede="Promote your events on social, send a campaign to past attendees, drop the link in WhatsApp groups, and watch what's working."
        ctas={[
          { label: "Open share kit",   href: "/dashboard/marketing",                  variant: "primary" },
          { label: "Email campaigns",  href: "/dashboard/marketing?tab=email",        variant: "ghost"   }
        ]}
        kpi={{
          label:   "Upcoming events",
          value:   upcomingCount.toLocaleString(),
          caption: `${followerCount.toLocaleString()} ${followerCount === 1 ? "follower" : "followers"} on tap`
        }}
      />

      <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[color:var(--border-hairline)] overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            scroll={false}
            href={`/dashboard/marketing${t.key === "dashboard" ? "" : `?tab=${t.key}`}`}
            className={"tab whitespace-nowrap " + (t.key === activeTab ? "tab-active" : "")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "dashboard" && <DashboardTab organizerId={session.user.id} />}
      {activeTab === "email"     && <EmailTab     organizerId={session.user.id} />}
      {activeTab === "social"    && <SocialTab    organizerId={session.user.id} />}
      {activeTab === "ads"       && <AdsTab    />}
      {activeTab === "whatsapp"  && <WhatsAppTab  organizerId={session.user.id} />}
      {activeTab === "promos"    && <PromosTab organizerId={session.user.id} role={session.user.role} />}
      {activeTab === "settings"  && <SettingsTab saved={saved} />}
    </div>
  );
}

/* ──────────────────────────────────────────
   Shared helpers
   ────────────────────────────────────────── */

function getOrigin(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "cultureflow.app";
  return `${proto}://${host}`;
}

function getTagline(): string {
  return cookies().get(TAGLINE_COOKIE)?.value?.slice(0, 200) || DEFAULT_TAGLINE;
}

async function getShareEvents(organizerId: string): Promise<ShareEvent[]> {
  const events = await prisma.event.findMany({
    where: { organizerId, status: { in: ["PUBLISHED", "DRAFT"] } },
    orderBy: { startsAt: "asc" },
    take: 50,
    select: {
      id: true, slug: true, title: true, summary: true,
      startsAt: true, city: true, country: true, venueName: true
    }
  });
  return events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary ?? null,
    startsAt: e.startsAt.toISOString(),
    city: e.city ?? null,
    country: e.country ?? null,
    venueName: e.venueName ?? null
  }));
}

/* ──────────────────────────────────────────
   Dashboard tab
   ────────────────────────────────────────── */

async function DashboardTab({ organizerId }: { organizerId: string }) {
  const [events, followerCount] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId, status: "PUBLISHED", endsAt: { gte: new Date() } },
      select: { id: true, title: true, slug: true, viewCount: true, _count: { select: { tickets: true } } },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    prisma.follow.count({ where: { followingId: organizerId } })
  ]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <Stat label="Followers" value={followerCount.toLocaleString()} />
        <Stat label="Upcoming events" value={events.length.toLocaleString()} />
        <Stat
          label="Total views this cycle"
          value={events.reduce((s, e) => s + (e.viewCount ?? 0), 0).toLocaleString()}
        />
      </div>

      <h2 className="mb-5 font-display text-[22px] font-bold text-nile-900 tracking-tight">Popular tools</h2>
      <div className="mb-10 grid gap-5 md:grid-cols-3">
        {TOOLS.map((c) => (
          <article key={c.title} className="card p-6">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-nile-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-nile" aria-hidden="true">
                {c.icon}
              </svg>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{c.eyebrow}</p>
            <h3 className="mt-2 text-[17px] font-bold leading-snug text-nile-900">{c.title}</h3>
            <Link href={c.href} className="mt-5 inline-flex text-sm font-semibold text-nile hover:underline">
              {c.cta} →
            </Link>
          </article>
        ))}
      </div>

      {events.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-[22px] font-bold text-nile-900 tracking-tight">Share your upcoming events</h2>
          <p className="mb-4 text-sm text-ink-600">
            Copy the event URL to post anywhere, or open the share kit for pre-filled copy.
          </p>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="card p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/events/${e.slug}`} className="font-semibold text-ink hover:text-nile truncate inline-block max-w-full">
                    {e.title}
                  </Link>
                  <div className="text-[12px] text-ink-500">
                    {e._count.tickets} ticket{e._count.tickets === 1 ? "" : "s"} sold · {e.viewCount} view{e.viewCount === 1 ? "" : "s"}
                  </div>
                </div>
                <Link href="/dashboard/marketing?tab=social" className="btn btn-ghost">Share kit</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/* ──────────────────────────────────────────
   Email tab — audience + mailto composer
   ────────────────────────────────────────── */

async function EmailTab({ organizerId }: { organizerId: string }) {
  const [tickets, followerCount] = await Promise.all([
    prisma.ticket.findMany({
      where: { event: { organizerId }, status: { in: ["ISSUED", "CHECKED_IN"] } },
      select: { attendeeEmail: true }
    }),
    prisma.follow.count({ where: { followingId: organizerId } })
  ]);
  const emails = Array.from(new Set(
    tickets.map((t) => t.attendeeEmail.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  )).sort();

  return (
    <section>
      <header className="mb-6">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Email campaigns</h2>
        <p className="mt-1 text-sm text-ink-600 max-w-3xl">
          Send a message to everyone who's bought a ticket to your events. We compose the draft in
          your own mail client so recipients stay BCC'd and nothing gets sent without your approval.
        </p>
      </header>
      <EmailAudience
        emails={emails}
        followerCount={followerCount}
        defaultSubject="An update from your event organizer"
      />
    </section>
  );
}

/* ──────────────────────────────────────────
   Social tab — ShareKit wrapper
   ────────────────────────────────────────── */

async function SocialTab({ organizerId }: { organizerId: string }) {
  const events = await getShareEvents(organizerId);
  return (
    <section>
      <header className="mb-6">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Social media kit</h2>
        <p className="mt-1 text-sm text-ink-600 max-w-3xl">
          Pick an event and get pre-filled copy plus one-tap share links for every major network.
        </p>
      </header>
      <ShareKit events={events} origin={getOrigin()} tagline={getTagline()} />
    </section>
  );
}

/* ──────────────────────────────────────────
   WhatsApp tab
   ────────────────────────────────────────── */

async function WhatsAppTab({ organizerId }: { organizerId: string }) {
  const events = await getShareEvents(organizerId);
  return (
    <section>
      <header className="mb-6">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">WhatsApp groups</h2>
        <p className="mt-1 text-sm text-ink-600 max-w-3xl">
          Build a paste-ready promo block for the WhatsApp groups you're already in.
        </p>
      </header>
      <WhatsAppKit events={events} origin={getOrigin()} tagline={getTagline()} />
    </section>
  );
}

/* ──────────────────────────────────────────
   Ads tab — informational, deep-links to
   Meta Ads Manager + TikTok Ads Manager
   ────────────────────────────────────────── */

function AdsTab() {
  return (
    <section>
      <header className="mb-6">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Paid social ads</h2>
        <p className="mt-1 text-sm text-ink-600 max-w-3xl">
          Meta and TikTok run the ad inventory your audience actually sees. Until {BRAND_NAME}'s native
          ad flow ships, use this checklist to run campaigns the efficient way.
        </p>
      </header>

      <ol className="space-y-3">
        {[
          {
            step: "1",
            title: "Pick the event you're boosting",
            body: <>Open your event on <Link href="/dashboard/events" className="text-nile hover:underline font-semibold">Events</Link> and copy its public URL.</>
          },
          {
            step: "2",
            title: "Grab pre-tested ad copy",
            body: <>The <Link href="/dashboard/marketing?tab=social" className="text-nile hover:underline font-semibold">Social media kit</Link> builds short + long copy you can paste directly into an ad set.</>
          },
          {
            step: "3",
            title: "Launch the campaign on Meta",
            body: <>Open <a className="text-nile hover:underline font-semibold" href="https://www.facebook.com/business/tools/ads-manager" target="_blank" rel="noopener noreferrer">Meta Ads Manager</a> and pick <em>Traffic</em> as the objective. Target by city + interest (community groups, church, cultural).</>
          },
          {
            step: "4",
            title: "Or launch on TikTok",
            body: <>Use <a className="text-nile hover:underline font-semibold" href="https://ads.tiktok.com" target="_blank" rel="noopener noreferrer">TikTok Ads Manager</a>. Short-form video outperforms static creative 3-4x on this audience.</>
          },
          {
            step: "5",
            title: "Track results in Reports",
            body: <>Ticket sales roll up on <Link href="/dashboard/reports" className="text-nile hover:underline font-semibold">Reports</Link>. Pair them with the ad platform's clicks to compute CAC.</>
          }
        ].map((row) => (
          <li key={row.step} className="card p-5 flex items-start gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nile-50 text-nile font-bold text-sm">
              {row.step}
            </span>
            <div>
              <div className="font-semibold text-nile-900">{row.title}</div>
              <div className="mt-1 text-[14px] text-ink-700">{row.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 card p-5 bg-gold-50 border-gold-100">
        <p className="text-[14px] text-ink-800">
          Want native ad launches from inside {BRAND_NAME}? <Link href="/contact?topic=ads" className="font-semibold text-nile hover:underline">Tell us you're interested</Link> — we prioritize the integrations organizers ask for.
        </p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   Promos tab — discount-code info
   ────────────────────────────────────────── */

async function PromosTab({ organizerId, role }: { organizerId: string; role: string }) {
  const codes = await prisma.promoCode.findMany({
    where: role === "ADMIN"
      ? {}
      : { OR: [{ event: { organizerId } }, { eventId: null }] },
    orderBy: { createdAt: "desc" },
    include: { event: { select: { id: true, title: true } } }
  });

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">
            Promo codes
          </h2>
          <p className="mt-1 text-sm text-ink-600 max-w-3xl">
            Codes buyers type at checkout. Percent-off or fixed-amount, scoped per-event or
            account-wide, with optional date windows + per-buyer caps.
          </p>
        </div>
        <Link href="/dashboard/marketing/promos/new" className="btn btn-primary">
          + New promo code
        </Link>
      </header>

      {codes.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-[color:var(--border-hairline)]">
          <div className="mx-auto h-14 w-14 rounded-full bg-acacia-50 flex items-center justify-center text-acacia-600">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12l-9 9-9-9 9-9z" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h3 className="mt-4 font-display text-[20px] font-bold text-nile-900">
            No promo codes yet
          </h3>
          <p className="mt-2 text-[14px] text-ink-600 max-w-md mx-auto">
            Codes are validated at checkout and clamped to the order subtotal — totals
            never go negative even if the discount exceeds the price.
          </p>
          <Link href="/dashboard/marketing/promos/new" className="btn btn-primary mt-5">
            Create your first code
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[color:var(--border-hairline)] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead className="bg-cream-100 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              <tr>
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Discount</th>
                <th className="text-left px-5 py-3">Scope</th>
                <th className="text-left px-5 py-3">Used</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3 sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-hairline)]">
              {codes.map((c) => {
                const valueLabel =
                  c.discountType === "PERCENT"
                    ? `${c.discountValue}% off`
                    : `${(c.discountValue / 100).toFixed(2)} off`;
                const usageLabel =
                  c.maxUses != null
                    ? `${c.usedCount} / ${c.maxUses}`
                    : c.usedCount.toString();
                const statusTone =
                  !c.active                                            ? "text-ink-500" :
                  c.endsAt && c.endsAt < new Date()                    ? "text-ink-500" :
                  c.startsAt && c.startsAt > new Date()                ? "text-gold-700" :
                  "text-acacia-600";
                const statusLabel =
                  !c.active                                            ? "Disabled" :
                  c.endsAt && c.endsAt < new Date()                    ? "Expired" :
                  c.startsAt && c.startsAt > new Date()                ? "Scheduled" :
                  "Live";
                return (
                  <tr key={c.id} className="hover:bg-cream-50">
                    <td className="px-5 py-4">
                      <div className="font-tabular tracking-wider font-bold text-nile-900">
                        {c.code}
                      </div>
                      {c.description && (
                        <div className="mt-0.5 text-[12px] text-ink-500 truncate max-w-[260px]">
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-tabular text-ink-900">{valueLabel}</td>
                    <td className="px-5 py-4 text-ink-700">
                      {c.event?.title ?? <span className="text-ink-500">All my events</span>}
                    </td>
                    <td className="px-5 py-4 font-tabular text-ink-700">{usageLabel}</td>
                    <td className={`px-5 py-4 text-[12px] font-bold uppercase tracking-[0.12em] ${statusTone}`}>
                      {statusLabel}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/marketing/promos/${c.id}`}
                        className="text-[13px] font-semibold text-nile hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────
   Settings tab — marketing preferences
   ────────────────────────────────────────── */

function SettingsTab({ saved }: { saved: boolean }) {
  const tagline = getTagline();
  return (
    <section>
      <header className="mb-6">
        <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">Marketing settings</h2>
        <p className="mt-1 text-sm text-ink-600 max-w-3xl">
          The default tagline appears at the end of every share-kit copy block. Keep it short —
          attendees see it before they click through.
        </p>
      </header>

      <form action={updateMarketingSettings} className="card p-6 space-y-5 max-w-2xl">
        <label className="block">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink">Default tagline</span>
            <span className="text-[12px] text-ink-500">Max 200 characters</span>
          </div>
          <input
            name="tagline"
            defaultValue={tagline}
            maxLength={200}
            className="input"
            placeholder={DEFAULT_TAGLINE}
          />
        </label>
        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-primary">Save tagline</button>
          {saved && <span role="status" className="text-sm font-semibold text-acacia-600">Saved ✓</span>}
        </div>
      </form>

      <div className="mt-10">
        <h3 className="font-display text-lg font-bold text-nile-900">Unsubscribe + compliance</h3>
        <p className="mt-1 text-[14px] text-ink-600 max-w-3xl">
          {BRAND_NAME} doesn't send marketing email on your behalf yet, so there's no list to manage here.
          If you bulk-compose through your own mail client via the <Link href="/dashboard/marketing?tab=email" className="text-nile hover:underline font-semibold">Email campaigns</Link> tab,
          remember to offer an opt-out — it's the law in most countries and it's just good practice.
        </p>
      </div>
    </section>
  );
}


type Tool = { eyebrow: string; title: string; icon: ReactNode; cta: string; href: string };
const TOOLS: Tool[] = [
  {
    eyebrow: "Share on social",
    title: "Share your event on TikTok, LinkedIn and Instagram",
    cta: "Open the share kit",
    href: "/dashboard/marketing?tab=social",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </>
    )
  },
  {
    eyebrow: "Email marketing",
    title: "Reach past attendees with a quick update",
    cta: "Compose an email",
    href: "/dashboard/marketing?tab=email",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    )
  },
  {
    eyebrow: "WhatsApp groups",
    title: "Paste-ready promo blocks for your WhatsApp groups",
    cta: "Build a WhatsApp post",
    href: "/dashboard/marketing?tab=whatsapp",
    icon: (
      <>
        <path d="M21 11.5a8.5 8.5 0 01-12.7 7.4L3 21l2.2-5.2A8.5 8.5 0 1121 11.5z" />
      </>
    )
  }
];
