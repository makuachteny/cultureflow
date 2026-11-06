export const revalidate = 3600;

import Link from "next/link";
import type { Metadata } from "next";
import MarketingPageHero from "@/components/marketing/MarketingPageHero";
import Icon, { type IconName } from "@/components/Icon";
import FaqItem from "@/components/FaqItem";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "For attendees — your people, your events",
  description:
    "Discover events for your community in your city and around the world. Buy safely, get your ticket in your pocket, never miss out."
};

/**
 * /for-attendees — marketing page. Rounded hero, four
 * value-prop tiles, a numbered steps band, and an FAQ grid.
 */
export default function ForAttendeesPage() {
  return (
    <>
      <MarketingPageHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "For attendees" }
        ]}
        title={<>Your people,<br />your events</>}
        subtitle="Cultural nights, weddings, church events, concerts, community forums. Find what's happening in your city and never miss the ones that matter."
        ctas={[
          { label: "Browse events",     href: "/browse",  variant: "solid" },
          { label: "Create an account", href: "/sign-up", variant: "ghost" }
        ]}
        imageSrc="/community/community-outdoors.jpg"
        tone="warm"
      />

      {/* ───── Value-prop tiles ───── */}
      <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              Everything an attendee needs
            </h2>
            <p className="mt-3 text-[14px] text-ink-700">
              From discovery to the door — in one ticket.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile icon="compass"      title="Discover"              body="Browse by city, category, date, and price. Filter for what you love." />
            <Tile icon="shield-check" title="Buy safely"            body="Transparent fees, refund protection if an event is cancelled." />
            <Tile icon="ticket"       title="Ticket in your pocket" body="QR + 6-character backup code. Works offline, screenshot-safe." />
            <Tile icon="bell"         title="Never miss out"        body="Follow organizers and get notified the moment they post." />
          </div>
        </div>
      </section>

      {/* ───── Steps band ───── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              Buying is three steps
            </h2>
            <p className="mt-3 text-[14px] text-ink-700">
              From scroll to standing at the door, in minutes.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step n={1} icon="search" title="Find" body="Search by city or category. Save the ones you're curious about." />
            <Step n={2} icon="card"   title="Buy"  body="Cards, Apple Pay, Google Pay, or mobile money. Guest checkout allowed." />
            <Step n={3} icon="qr"     title="Scan" body="Show your QR or 6-digit code at the door. Screenshot-safe." />
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              Common questions
            </h2>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 max-w-4xl mx-auto">
            <FaqItem defaultOpen q="What if the event is cancelled?" a="Automatic full refund. No forms to fill out, no organizer chase." />
            <FaqItem             q="What if my phone dies at the door?" a="Your ticket has a 6-character backup code. Read it off a screenshot, show it at check-in — you're in." />
            <FaqItem             q="Can I buy for someone else?" a="Yes. Enter the attendee's name and email at checkout. Transfer to another person anytime (if the organizer enabled it)." />
            <FaqItem             q="How do I find events near me?" a={<>Use the city filter on <Link href="/browse" className="text-nile font-semibold hover:underline">Browse</Link>, or start from a city page like <Link href="/events/city/london" className="text-nile font-semibold hover:underline">London</Link>.</>} />
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
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
            Your next gathering is waiting
          </h2>
          <p className="mt-2 text-white/85 max-w-xl mx-auto text-[14px]">
            Join thousands already finding their people through {BRAND_NAME}.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/browse"  className="btn btn-gold">Browse events</Link>
            <Link href="/sign-up" className="btn btn-outline-light">Create an account</Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ────────── Building blocks ────────── */

function Tile({
  title, body, icon
}: { title: string; body: string; icon: IconName; tint?: string }) {
  return (
    <div className="group rounded-md bg-white p-6 shadow-sm motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-card">
      <span className="inline-flex h-10 w-10 text-nile">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="mt-5 font-display text-[20px] font-semibold text-nile-900 leading-tight">
        {title}
      </h3>
      <p className="mt-2 text-[14px] text-ink-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  n, title, body
}: { n: number; title: string; body: string; icon: IconName }) {
  return (
    <div className="rounded-md bg-white p-6 shadow-sm motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-card">
      <span
        aria-hidden
        className="font-display font-semibold text-[40px] leading-none text-nile tabular-nums"
      >
        {n.toString().padStart(2, "0")}
      </span>
      <span className="sr-only">Step {n}:</span>
      <h3 className="mt-4 font-display text-[20px] font-semibold text-nile-900 leading-tight">
        {title}
      </h3>
      <p className="mt-2 text-[14px] text-ink-700 leading-relaxed">{body}</p>
    </div>
  );
}

/* Local Faq helper removed — use the shared `@/components/FaqItem`. */
