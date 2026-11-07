import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import MarketingPageHero from "@/components/marketing/MarketingPageHero";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title:       "Become a member",
  description:
    "Join the CultureFlow membership: early access to events, member-only gatherings, and a closer connection to the communities you care about, wherever they gather."
};

/**
 * /subscription — the "Become a member" landing page.
 *
 * The home-page hero CTA points here. The page explains the membership,
 * shows tiers, and routes the visitor to the right next step:
 *   • signed-out  → /sign-up (and from there back to /subscription on success)
 *   • signed-in   → membership management (placeholder — wires up to a
 *                   real billing flow later; for now points at /account)
 *
 * Membership benefits are intentionally aspirational and worded to fit
 * a community-events platform, not a generic SaaS subscription.
 */
export default async function SubscriptionPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  // After sign-up, send the visitor back here so the upgrade prompt is
  // the next thing they see.
  const ctaHref = signedIn ? "/account" : "/sign-up?callbackUrl=/subscription";
  const ctaLabel = signedIn ? "Manage membership" : "Become a member";

  return (
    <>
      <MarketingPageHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Membership" }
        ]}
        title={<>Become<br />a member</>}
        subtitle={`A closer connection to ${BRAND_NAME} — early access, member-only gatherings, and a quiet way to support the platform that gathers our communities.`}
        ctas={[
          { label: ctaLabel, href: ctaHref, variant: "solid" },
          { label: "Browse events", href: "/browse", variant: "ghost" }
        ]}
        imageSrc="/community/cultural-confetti.jpg"
        imageAlt="Members gathered at a CultureFlow event"
        tone="warm"
      />

      {/* ─────── Tiers ─────── */}
      <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
              Pick your tier
            </div>
            <h2 className="mt-2 font-display text-[28px] sm:text-[36px] font-extrabold leading-[1.1] tracking-tight text-nile-900">
              Two ways to be part of the community
            </h2>
            <p className="mt-3 text-[15px] text-ink-700 leading-relaxed">
              Free is enough to discover events and buy tickets. Members get
              early access, monthly cultural gatherings, and a small but
              meaningful set of perks in cities around the world.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <Tier
              name="Friend"
              price="Free"
              cadence="forever"
              tagline="Discover and attend events. No card needed."
              features={[
                "Browse every public event",
                "Buy tickets — card, M-Pesa, MoMo, m-Gurush",
                "Save events with the heart icon",
                "Follow organizers and communities",
                "Personalized For You feed"
              ]}
              cta={{ label: "Continue as Friend", href: signedIn ? "/" : "/sign-up", variant: "ghost" }}
            />
            <Tier
              name="Member"
              price="$4"
              cadence="per month"
              tagline="Early access + cultural gatherings + member perks."
              accent
              features={[
                "Everything in Friend",
                "Early access — 24h before tickets open to everyone",
                "Monthly member-only cultural gathering",
                "No service fee on free events you host",
                "Member badge on your profile and comments",
                "First look at Featured This Week"
              ]}
              cta={{ label: ctaLabel, href: ctaHref, variant: "solid" }}
            />
          </div>
        </div>
      </section>

      {/* ─────── Why members ─────── */}
      <section className="py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <Pillar
              eyebrow="Closer"
              title="Closer to the gathering"
              body="Member-only events curated each month — small dinners, cultural nights, organizer Q&As. Always free for members."
            />
            <Pillar
              eyebrow="Earlier"
              title="A 24-hour head start"
              body="High-demand events sell out fast. Members see new ticket drops a day before the rest of the platform."
            />
            <Pillar
              eyebrow="Lighter"
              title="Lighter fees, hosted"
              body="Hosting a free community event? Members pay no service fee on it. Paid events stay at the standard pricing."
            />
          </div>
        </div>
      </section>

      {/* ─────── CTA band ─────── */}
      <section className="bg-organizer-pitch text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 text-center">
          <h2 className="font-display text-[26px] sm:text-[34px] font-bold leading-[1.1] tracking-tight">
            Ready when you are.
          </h2>
          <p className="mt-3 text-white/80 text-[14.5px] max-w-xl mx-auto leading-relaxed">
            Cancel anytime. Membership renews monthly and supports the
            platform that gathers communities of every culture,
            everywhere.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center h-11 px-5 rounded-full bg-white text-nile-900 text-[14px] font-bold hover:bg-cream-100 transition-colors"
            >
              {ctaLabel}
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center h-11 px-5 rounded-full ring-1 ring-white/30 text-white text-[14px] font-semibold hover:bg-white/10 transition-colors"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function Tier({
  name, price, cadence, tagline, features, accent, cta
}: {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  accent?: boolean;
  cta: { label: string; href: string; variant: "solid" | "ghost" };
}) {
  return (
    <div className={
      "relative flex flex-col rounded-2xl bg-white p-6 sm:p-8 ring-1 " +
      (accent
        ? "ring-gold/60 shadow-[8px_8px_0_0_#FCDD09]"
        : "ring-[color:var(--border-hairline)]")
    }>
      {accent && (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-gold px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-nile-900 shadow-sm">
          Recommended
        </span>
      )}

      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
        {name}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[36px] sm:text-[42px] font-extrabold tracking-tight text-nile-900 leading-none">
          {price}
        </span>
        <span className="text-[13px] text-ink-600">{cadence}</span>
      </div>

      <p className="mt-3 text-[14px] text-ink-700 leading-relaxed">{tagline}</p>

      <ul className="mt-5 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[14px] text-ink-900 leading-snug">
            <svg viewBox="0 0 24 24" className="h-4 w-4 mt-0.5 shrink-0 text-acacia-600" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={cta.href}
        className={
          "mt-7 inline-flex items-center justify-center rounded-full h-11 px-5 text-[14px] font-semibold transition-colors " +
          (cta.variant === "solid"
            ? "bg-nile-900 text-white hover:bg-nile-800 shadow-sm"
            : "bg-ink-900/5 text-ink-900 hover:bg-ink-900/10")
        }
      >
        {cta.label}
      </Link>
    </div>
  );
}

function Pillar({
  eyebrow, title, body
}: {
  eyebrow: string; title: string; body: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
        {eyebrow}
      </div>
      <h3 className="mt-2 font-display text-[20px] sm:text-[22px] font-bold leading-[1.15] tracking-tight text-nile-900">
        {title}
      </h3>
      <p className="mt-2 text-[14px] text-ink-700 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
