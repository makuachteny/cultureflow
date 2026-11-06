import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Create an event",
  description:
    "Gather the tribe — publish in five minutes and handle cards + mobile money in one checkout."
};

/**
 * /events/new — public marketing landing.
 *
 * Dark `bg-organizer-pitch` hero with a split layout: copy + CTAs on
 * the left, a photograph on the right. Distinct from the attendee-facing
 * home page (cream card + warm gradient) so the two entry points don't
 * read as duplicates.
 *
 * The builder lives at /dashboard/events/new (middleware-gated). Unauth'd
 * users hitting the CTA bounce through /sign-in?callbackUrl=... and
 * land back on the builder.
 */
export default function CreateEventLandingPage() {
  return (
    <>
      {/* ─────────── HERO — dark, split (content left, photo right) ─────────── */}
      <section className="bg-organizer-pitch text-white relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <div className="[&_a]:text-white/70 [&_a:hover]:text-white [&_span]:text-white">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Create event" }
              ]}
            />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-10 sm:pb-14 lg:pb-16">
          <div className="grid gap-8 md:grid-cols-2 md:gap-10 items-stretch">
            {/* Content */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.20em] text-gold-400">
                For organizers
              </div>
              <h1 className="mt-4 font-display text-[40px] sm:text-[56px] md:text-[64px] font-extrabold uppercase leading-[0.95] tracking-[-0.02em]">
                Gather the tribe.
                <br />
                <span className="text-gold-400">We&rsquo;ll do the tickets.</span>
              </h1>
              <p className="mt-5 text-[15px] sm:text-[17px] text-white/80 leading-relaxed max-w-xl">
                Publish in five minutes. Cards, Apple Pay, Google Pay, and mobile
                money — all in one checkout.
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                <Link href="/dashboard/events/new" className="btn btn-gold">
                  Get started for free
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link href="/for-organizers" className="btn btn-outline-light">
                  Explore features
                </Link>
              </div>

              <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/70 uppercase tracking-[0.14em] font-semibold">
                {["5-minute setup", "2.9% card · 2.5% mobile money", "No monthly fee"].map((t, i) => (
                  <li key={t} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-white/30" />}
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Photo — rounded, gold-ringed. `min-h` gives it real estate on
                mobile; on ≥md, `items-stretch` on the grid makes it match
                the content column's height exactly. */}
            <div className="relative min-h-[320px] md:min-h-0 rounded-2xl overflow-hidden ring-2 ring-gold/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)]">
              <Image
                src="/community/events-new-hero.jpg"
                alt="A community gathered in celebration"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Create. Share. Sell. ─────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
              How it works
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-ink-900 leading-[1.1]">
              Create. Share. Sell.
            </h2>
            <p className="mt-3 text-[14px] text-ink-700">
              Three steps from idea to door. Phone-ready, draft-friendly, cross-border by default.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Step
              n={1}
              title="Build your page"
              body="Title, date, venue, tiers. Takes five minutes on your phone."
            />
            <Step
              n={2}
              title="Share anywhere"
              body="One-tap WhatsApp share. Rich previews on iMessage, Facebook, LinkedIn."
            />
            <Step
              n={3}
              title="Get paid"
              body="Cards, Apple Pay, Google Pay, and mobile money — all in one checkout."
            />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/dashboard/events/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 text-white h-11 px-5 text-[14px] font-semibold hover:bg-ink-800 transition-colors"
            >
              Get started for free
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

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
