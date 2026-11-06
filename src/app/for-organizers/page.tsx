export const revalidate = 3600;

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import MarketingPageHero from "@/components/marketing/MarketingPageHero";
import Icon, { type IconName } from "@/components/Icon";

export const metadata: Metadata = {
  title: "For organizers — your events, your community, your rules",
  description:
    "Publish an event in under five minutes. Cards, Apple Pay, Google Pay, and mobile money in one checkout. Keep more of your revenue."
};

/**
 * /for-organizers — marketing page for hosts.
 *
 * Layout chassis:
 *   1. Breadcrumbs
 *   2. Rounded cream container floating on a warm gradient background,
 *      holding a big uppercase headline + subtitle + CTAs on the left and
 *      a hero image on the right.
 *   3. "Event hosting made easy" split section with phone-mockup card on
 *      the right and feature list on the left.
 *   4. 4-col feature-tile grid ("All the tools organizers need…") with
 *      gray card backgrounds and pill CTAs.
 *   5. "Get paid, earn more" band with fees callout.
 *   6. Final dark CTA.
 */
export default function ForOrganizersPage() {
  return (
    <>
      <MarketingPageHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "For organizers" }
        ]}
        title={<>Where event<br />organizers grow</>}
        subtitle="The all-in-one ticketing and discovery platform trusted by organizers building community anywhere in the world."
        ctas={[
          { label: "Get started for free", href: "/events/new", variant: "solid" },
          { label: "Contact sales",        href: "/contact",    variant: "ghost" }
        ]}
        imageSrc="/community/music-concert-crowd.jpg"
        tone="warm"
      />

      {/* ──────────── "Event hosting made easy" — split feature list + phone mockup ──────────── */}
      <section className="bg-cream-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-[30px] sm:text-[38px] tracking-tight text-ink-900 leading-[1.1]">
              Event hosting made easy
            </h2>
            <p className="mt-3 text-[15px] text-ink-700">
              Easily create events for free on a platform that attendees love and trust.
            </p>
          </div>

          <div className="mt-10 grid gap-12 md:grid-cols-2 items-center">
            <ul className="divide-y divide-ink-900/10">
              <FeatureItem
                title="Event ticketing"
                body="Sell more tickets with customizable event pages and a seamless checkout experience for attendees on a trusted platform."
              />
              <FeatureItem
                title="Reporting & analytics"
                body="Learn more about your buyers and discover where sales are coming from with real-time analytics."
              />
              <FeatureItem
                title="Organizer app"
                body="Check guests in, sell tickets at the door, and track data with our easy-to-use organizer app."
              />
              <FeatureItem
                title="Payments that reach everyone"
                body="Cards, Apple Pay, Google Pay, and mobile money — all in one checkout, wherever your audience lives."
              />
            </ul>

            {/* Phone mockup — rounded cream card with photo inside a device frame */}
            <div className="relative mx-auto w-full max-w-[380px] aspect-[9/16] rounded-md p-3"
              style={{ background: "linear-gradient(135deg, #F5B800 0%, #2E5CB8 100%)" }}>
              <div className="relative h-full w-full rounded-md bg-white overflow-hidden border-4 border-ink-900 shadow-lift">
                {/* Notch */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-4 w-20 rounded-full bg-ink-900 z-[2]" />
                {/* App top bar */}
                <div className="absolute inset-x-0 top-0 h-10 flex items-end justify-between px-4 pb-1 text-[10px] font-semibold text-ink-900 z-[1]">
                  <span>9:41</span>
                  <span>••• ⚡ ■</span>
                </div>
                {/* Hero image */}
                <div className="absolute inset-0 pt-10">
                  <div className="relative h-[55%] w-full">
                    <Image
                      src="/community/music-concert-crowd.jpg"
                      alt=""
                      fill
                      sizes="380px"
                      className="object-cover"
                    />
                    <span className="absolute right-3 top-3 rounded-md bg-acacia text-white text-[10px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5">
                      Few tickets left
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="font-display font-bold text-[15px] leading-tight text-ink-900">
                      Cultural Night — Your City
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-500">The Armory</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-ink-600">Sat, Oct 18 · 7:00 PM</span>
                      <span className="inline-flex items-center rounded-full bg-nile text-white px-2 py-0.5 text-[10px] font-bold">
                        From $20
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── 4-col feature tiles ──────────── */}
      <section className="bg-white border-t border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-display font-extrabold text-[30px] sm:text-[38px] tracking-tight text-ink-900 leading-[1.1]">
              All the tools organizers need to host events and grow their community
            </h2>
            <p className="mt-3 text-[15px] text-ink-700">
              From ticketing to payments, tools to promote, market, and manage your events seamlessly.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ToolTile
              tint="nile" icon="ticket"
              title="Event ticketing"
              body="Everything you need to sell tickets for in-person or online events."
              cta="See ticketing tools"
              href="/how-it-works"
            />
            <ToolTile
              tint="acacia" icon="phone"
              title="Mobile money"
              body="Mobile money, cards, and local rails — the payment mix your attendees actually use."
              cta="See payment rails"
              href="/pricing"
            />
            <ToolTile
              tint="nile" icon="megaphone"
              title="Marketing tools"
              body="WhatsApp share, rich previews, email reminders — all built-in."
              cta="See marketing tools"
              href="/how-it-works"
            />
            <ToolTile
              tint="gold" icon="vault"
              title="Payouts"
              body="Low-cost fees and quicker payouts. Keep more of what your community pays."
              cta="See pricing"
              href="/pricing"
            />
          </div>
        </div>
      </section>

      {/* ──────────── "Get paid, earn more" band ──────────── */}
      <section className="bg-cream-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 text-center">
          <h2 className="font-display font-extrabold text-[30px] sm:text-[38px] tracking-tight text-ink-900 leading-[1.1]">
            Get paid, earn more
          </h2>
          <p className="mt-3 text-[15px] text-ink-700 max-w-xl mx-auto">
            Do what you love and earn more money with low-cost fees and quicker payouts.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto">
            <FeeCard icon="card"     rate="2.9% + $0.50" label="On card tickets" />
            <FeeCard icon="phone"    rate="2.5% + $0.25" label="On mobile money" accent />
            <FeeCard icon="infinity" rate="No minimums"  label="Keep it, launch it, pause it" />
          </div>
        </div>
      </section>

      {/* ──────────── Final dark CTA ──────────── */}
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
          <h2 className="font-display font-bold text-[28px] sm:text-[34px] tracking-tight">
            Start hosting — it&apos;s free.
          </h2>
          <p className="mt-2 text-white/85 max-w-xl mx-auto text-[14px]">
            You keep your community. We take care of the plumbing.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/events/new" className="btn btn-gold">Create an event</Link>
            <Link href="/pricing" className="btn btn-outline-light">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ────────── Building blocks ────────── */

function FeatureItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3 py-5 first:pt-0 last:pb-0">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-acacia-600">
        <Icon name="check" size={20} />
      </span>
      <div>
        <div className="font-display font-semibold text-[17px] text-nile-900">{title}</div>
        <p className="mt-1 text-[14px] text-ink-700 leading-relaxed max-w-md">{body}</p>
      </div>
    </li>
  );
}

function ToolTile({
  title, body, cta, href, icon
}: {
  title: string; body: string; cta: string; href: string;
  icon: IconName; tint?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-md bg-white p-6 flex flex-col shadow-sm motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-card"
    >
      <span className="inline-flex h-10 w-10 text-nile">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="mt-5 font-display font-semibold text-[20px] text-nile-900 leading-tight">
        {title}
      </h3>
      <p className="mt-2 text-[14px] text-ink-700 leading-relaxed flex-1">{body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-nile group-hover:text-nile-700 motion-safe:transition-colors">
        {cta}
        <Icon name="arrow-ur" size={14} />
      </span>
    </Link>
  );
}

function FeeCard({
  rate, label, accent, icon
}: { rate: string; label: string; accent?: boolean; icon: IconName }) {
  return (
    <div className={
      "rounded-md p-6 text-left motion-safe:transition-shadow motion-safe:duration-200 " +
      (accent
        ? "bg-nile-800 text-white shadow-card"
        : "bg-white shadow-sm hover:shadow-card")
    }>
      <span className={"inline-flex h-9 w-9 " + (accent ? "text-gold-400" : "text-nile")}>
        <Icon name={icon} size={26} />
      </span>
      <div className={"mt-4 font-display font-semibold text-[26px] leading-[1] font-tabular tracking-tight " + (accent ? "text-gold-400" : "text-nile-900")}>
        {rate}
      </div>
      <div className={"mt-2 text-[13.5px] " + (accent ? "text-white/85" : "text-ink-700")}>
        {label}
      </div>
    </div>
  );
}
