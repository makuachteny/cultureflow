export const revalidate = 3600;

import Link from "next/link";
import type { Metadata } from "next";
import MarketingPageHero from "@/components/marketing/MarketingPageHero";
import FaqItem from "@/components/FaqItem";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Pricing — simple fees, no surprises",
  description:
    "Free events stay free. Paid events carry a transparent per-ticket fee that beats most general-purpose ticketing platforms. Mobile money pricing tuned for in-country organizers."
};

/**
 * /pricing — marketing layout. Rounded hero container on a warm gradient,
 * three pricing tiers on a cream band, a comparison table + payment FAQ
 * on white, and a dark Nile CTA band at the bottom.
 */
export default function PricingPage() {
  return (
    <>
      <MarketingPageHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Pricing" }
        ]}
        title={<>Simple pricing,<br />no surprises</>}
        subtitle="Free events are always free. Paid events come in below the industry standard, with a mobile-money tier tuned for in-country organizers."
        ctas={[
          { label: "Start hosting — it's free", href: "/events/new", variant: "solid" },
          { label: "Compare fees",              href: "#compare",    variant: "ghost" }
        ]}
        imageSrc="/community/networking-hands.jpg"
        tone="warm"
      />

      {/* ─────── Pricing tiers (cream band) ─────── */}
      <section className="bg-cream-100 border-y border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
              Pricing
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[36px] tracking-tight text-ink-900 leading-[1.05]">
              Pick a tier, host in minutes
            </h2>
            <p className="mt-3 text-[15px] text-ink-700 leading-relaxed">
              No monthly minimums. Pay only when your community pays.
            </p>
          </div>

          <div className="mt-12 sm:mt-14 grid gap-5 sm:gap-6 md:grid-cols-3 items-stretch">
            <Tier
              name="Free events"
              price="Free"
              cadence="forever"
              tagline="Always free to publish, always free to RSVP."
              features={[
                "Unlimited free events",
                "Guest list + RSVP",
                "Attendee follow + notifications",
                "Shareable event pages"
              ]}
            />
            <Tier
              name="Paid — card"
              price="2.9%"
              cadence="+ $0.50 / ticket"
              tagline="Per paid ticket, plus standard Stripe processing."
              features={[
                "Cards, Apple Pay, Google Pay",
                "Payouts via Stripe",
                "Refund + chargeback protection",
                "Below the typical 3.7% + $1.79 platform fee"
              ]}
              highlight
            />
            <Tier
              name="Paid — mobile money"
              price="2.5%"
              cadence="+ ~$0.25 / ticket"
              tagline="Per paid ticket, in local currency equivalent."
              features={[
                "Mobile money + local rails in one checkout",
                "Tuned for low-ticket, high-volume events",
                "Payout to mobile wallet in minutes",
                "Pay-at-door fallback (organizer choice)"
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─────── Compare band ─────── */}
      <section id="compare" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
              Compare
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[36px] tracking-tight text-ink-900 leading-[1.05]">
              How we compare
            </h2>
            <p className="mt-3 text-[14.5px] text-ink-700 leading-relaxed">
              Per paid ticket on an event with a $30 ticket price.
            </p>
          </div>

          {/* Outer frame — rounded, hairline ring, no shadow. Lets the
              table breathe without pretending to float. */}
          <div className="mt-10 rounded-2xl ring-1 ring-[color:var(--border-hairline)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead className="bg-nile-50 text-nile-900 text-[12px] font-semibold uppercase tracking-[0.06em]">
                  <tr>
                    <th className="text-left px-5 sm:px-6 py-4">Platform</th>
                    <th className="text-left px-5 sm:px-6 py-4">Fee formula</th>
                    <th className="text-left px-5 sm:px-6 py-4">Fee on $30</th>
                    <th className="text-left px-5 sm:px-6 py-4 whitespace-nowrap">Mobile money?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t-2 border-gold/40 bg-gold-50/40">
                    <td className="px-5 sm:px-6 py-5 font-bold text-nile-900">{BRAND_NAME}</td>
                    <td className="px-5 sm:px-6 py-5 font-tabular text-ink-800">2.9% + $0.50</td>
                    <td className="px-5 sm:px-6 py-5 font-bold font-tabular text-nile-900">$1.37</td>
                    <td className="px-5 sm:px-6 py-5 text-acacia-700 font-semibold">Yes — multiple rails</td>
                  </tr>
                  <tr className="border-t border-[color:var(--border-hairline)]">
                    <td className="px-5 sm:px-6 py-5 text-ink-800">Major US ticketing platform</td>
                    <td className="px-5 sm:px-6 py-5 font-tabular text-ink-700">3.7% + $1.79</td>
                    <td className="px-5 sm:px-6 py-5 font-tabular text-ink-700">$2.90</td>
                    <td className="px-5 sm:px-6 py-5 text-ink-500">No</td>
                  </tr>
                  <tr className="border-t border-[color:var(--border-hairline)]">
                    <td className="px-5 sm:px-6 py-5 text-ink-800">Independent host platforms</td>
                    <td className="px-5 sm:px-6 py-5 font-tabular text-ink-700">5% + processor</td>
                    <td className="px-5 sm:px-6 py-5 font-tabular text-ink-700">$1.50 + processor</td>
                    <td className="px-5 sm:px-6 py-5 text-ink-500">No</td>
                  </tr>
                  <tr className="border-t border-[color:var(--border-hairline)]">
                    <td className="px-5 sm:px-6 py-5 text-ink-800">Local door-deal apps</td>
                    <td className="px-5 sm:px-6 py-5 text-ink-700">Per-ticket, variable</td>
                    <td className="px-5 sm:px-6 py-5 font-tabular text-ink-700">~$2.00–$2.50</td>
                    <td className="px-5 sm:px-6 py-5 text-ink-500">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-ink-500 leading-relaxed">
            Figures are approximate — each platform&rsquo;s exact fee varies by plan and region. Verify at booking.
          </p>
        </div>
      </section>

      {/* ─────── FAQ band ─────── */}
      <section className="bg-cream-100 border-t border-[color:var(--border-hairline)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
              FAQ
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[36px] tracking-tight text-ink-900 leading-[1.05]">
              Common questions
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <FaqItem defaultOpen q="Who pays the fee?" a="Your choice, per event. Absorb it into the ticket price or pass it to attendees — either way, attendees see the full total before they commit." />
            <FaqItem             q="When do I get paid?" a="Card payouts follow Stripe's standard schedule (2–7 business days). Mobile money payouts land in minutes." />
            <FaqItem             q="What about refunds?" a="You set the refund policy per event. We handle the refund flow, and the fee is returned to you on eligible refunds." />
            <FaqItem             q="Can I host free events?" a="Always. Free events carry no platform fee. RSVPs, attendee lists, and shareable pages are all included." />
          </div>
        </div>
      </section>

      {/* ─────── Final dark CTA ─────── */}
      <section className="bg-hibiscus text-white relative overflow-hidden">
        <div aria-hidden className="beads absolute inset-x-0 top-0" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center">
          <h2 className="font-display font-extrabold text-[28px] sm:text-[36px] tracking-tight leading-[1.05]">
            Ready to host?
          </h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto text-[14.5px] leading-relaxed">
            Create an event in five minutes. Keep more of what your community pays — and keep your community close.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Link href="/events/new"       className="btn btn-gold">Start hosting</Link>
            <Link href="/for-organizers"   className="btn btn-outline-light">See organizer tools</Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ────────── Building blocks ────────── */

function Tier({ name, price, cadence, tagline, features, highlight }: {
  name: string; price: string; cadence: string; tagline: string; features: string[]; highlight?: boolean;
}) {
  return (
    <div className={
      "relative flex flex-col rounded-2xl bg-white p-7 sm:p-8 motion-safe:transition-shadow " +
      (highlight
        ? "ring-2 ring-nile shadow-[8px_8px_0_0_#0F47AF] sm:scale-[1.02]"
        : "ring-1 ring-[color:var(--border-hairline)] hover:shadow-card")
    }>
      {highlight && (
        <span className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-nile px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
          Most popular
        </span>
      )}

      {/* Tier name */}
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
        {name}
      </div>

      {/* Price + cadence — two-line hierarchy with the headline number
          dominant and the per-ticket suffix sitting beneath in muted ink. */}
      <div className="mt-3">
        <div className="font-display text-[40px] sm:text-[44px] font-extrabold leading-none tracking-tight text-nile-900 font-tabular">
          {price}
        </div>
        <div className="mt-1.5 text-[12.5px] text-ink-600 font-tabular">
          {cadence}
        </div>
      </div>

      {/* Tagline */}
      <p className="mt-4 text-[13.5px] text-ink-700 leading-relaxed">
        {tagline}
      </p>

      {/* Hairline divider before the feature list — gives the price a
          chance to read as a headline rather than running into the bullets. */}
      <div className="mt-6 h-px bg-[color:var(--border-hairline)]" />

      <ul className="mt-5 space-y-3 text-[13.5px] text-ink-800">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-acacia-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Old open-always Faq helper removed — use `FaqItem` (collapsible <details>). */
