export const revalidate = 3600;

import Link from "next/link";
import type { Metadata } from "next";
import MarketingPageHero from "@/components/marketing/MarketingPageHero";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "How it works",
  description:
    `How ${BRAND_NAME} works — for attendees finding events, and for organizers hosting them.`
};

/**
 * /how-it-works — marketing page. Rounded hero on warm
 * gradient, two cream bands explaining the attendee + organizer flow with
 * numbered step cards, a split "why two sides" band, and a final CTA.
 */
export default function HowItWorksPage() {
  return (
    <>
      <MarketingPageHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "How it works" }
        ]}
        title={<>One product,<br />two sides</>}
        subtitle="Find events you love, or host events for your community — one ticket that works on both sides of the digital divide."
        ctas={[
          { label: "Browse events",     href: "/browse",      variant: "solid" },
          { label: "Host an event",     href: "/events/new",  variant: "ghost" }
        ]}
        imageSrc="/community/cultural-dancers-flags.jpg"
        tone="warm"
      />

      {/* ─────── For attendees ─────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
              For attendees
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              Find it. Buy it. Scan it.
            </h2>
            <p className="mt-3 text-[14px] text-ink-700">
              Three steps from idle scroll to standing at the door.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Step n={1} title="Discover" body="Browse by city, category, date, price. Save events, follow organizers — never miss one." />
            <Step n={2} title="Buy"      body="Cards, Apple Pay, Google Pay, or mobile money. Guest checkout allowed — no sign-up wall." />
            <Step n={3} title="Scan"     body="QR or 6-digit backup code at the door. Screenshot-safe, offline-ready." />
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/for-attendees"
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 text-ink-900 h-10 px-4 text-[13px] font-semibold hover:bg-cream-200 transition-colors"
            >
              Read the attendee guide
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────── For organizers ─────── */}
      <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-nile-600">
              For organizers
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              Create. Share. Sell. Run it.
            </h2>
            <p className="mt-3 text-[14px] text-ink-700">
              A five-minute setup on your phone — then we handle the checkout, the payouts, and the door.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <Step n={1} title="Create" body="Five-minute setup on a phone. Title, date, venue, ticket tiers." />
            <Step n={2} title="Share"  body="One-tap WhatsApp share with rich preview. Embed in newsletters." />
            <Step n={3} title="Sell"   body="Cards and mobile money in one checkout. You choose who pays the fee." />
            <Step n={4} title="Run it" body="Attendee list, door check-in, CSV export, payouts." />
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/for-organizers"
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 text-ink-900 h-10 px-4 text-[13px] font-semibold hover:bg-cream-200 transition-colors"
            >
              Read the organizer guide
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────── Why two sides? ─────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
              Why two sides?
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              One ticket, two networks, same event.
            </h2>
            <p className="mt-4 text-[14px] text-ink-700 leading-relaxed">
              Communities gather on both sides of a huge digital divide —
              a wedding in a low-bandwidth town on a $120 Android over 3G, and a
              cultural gala in a major city on an iPhone over fibre.
            </p>
            <p className="mt-3 text-[14px] text-ink-700 leading-relaxed">
              We&apos;re building for both: a rich full experience for broadband users,
              and a lighter, mobile-money-native experience for lower-bandwidth users —
              same events, same organizers, one ticket that works anywhere.
            </p>
          </div>
          <div className="grid gap-3">
            <Comparison left="Low bandwidth" right="Broadband" leftBody="3G Android · mobile money · pay-at-door" rightBody="iPhone · Apple Pay · delivered ticket" />
            <Comparison left="Home region"   right="Diaspora"  leftBody="Mobile wallet · SMS confirmation"         rightBody="Card · email + calendar invite" />
            <Comparison left="On the move"   right="Planning ahead" leftBody="QR screenshot · offline-safe"          rightBody="Google Pay · passbook ticket" />
          </div>
        </div>
      </section>

      {/* ─────── Final CTA ─────── */}
      <section className="bg-nile-800 text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(800px 400px at 90% -10%, rgba(245,184,0,0.16), transparent 60%)," +
              "radial-gradient(600px 320px at -10% 110%, rgba(46,92,184,0.22), transparent 60%)"
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 text-center">
          <h2 className="font-display font-bold text-[26px] sm:text-[32px] tracking-tight">
            Ready to join the tribe?
          </h2>
          <p className="mt-2 text-white/85 max-w-xl mx-auto text-[14px]">
            Browse what&rsquo;s on, or host something yourself. Either way, we&rsquo;re glad you&rsquo;re here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/browse"     className="btn btn-gold">Browse events</Link>
            <Link href="/events/new" className="btn btn-outline-light">Host an event</Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ────────── Building blocks ────────── */

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-md bg-white border border-[color:var(--border-hairline)] p-5 shadow-sm">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold text-ink-900 font-bold text-[13px] font-tabular">
        {n.toString().padStart(2, "0")}
      </div>
      <div className="mt-3 font-display text-[16px] font-bold text-nile-900">{title}</div>
      <p className="mt-1 text-[13px] text-ink-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Comparison({
  left, right, leftBody, rightBody
}: { left: string; right: string; leftBody: string; rightBody: string }) {
  return (
    <div className="rounded-md border border-[color:var(--border-hairline)] bg-cream-100 overflow-hidden grid grid-cols-2">
      <div className="p-4 border-r border-[color:var(--border-hairline)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-700">{left}</div>
        <div className="mt-1 text-[13px] text-ink-800">{leftBody}</div>
      </div>
      <div className="p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-nile-600">{right}</div>
        <div className="mt-1 text-[13px] text-ink-800">{rightBody}</div>
      </div>
    </div>
  );
}
