import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

/**
 * PromoCard — platform-promo banner shown on the /browse page above the
 * filters. Two columns:
 *   • Left:  eyebrow + headline + supporting copy + CTAs
 *   • Right: three solid feature tiles.
 *
 * Solid surfaces only — no glassy translucent panels, no blurred glow
 * accents. Visual depth comes from a single `bg-cta-deep` linear-gradient
 * background and the gold ornament next to the eyebrow.
 */
export default function PromoCard() {
  return (
    <section
      aria-label={`Host on ${BRAND_NAME}`}
      className="overflow-hidden rounded-2xl bg-cta-deep text-white"
    >
      <div className="grid gap-10 md:grid-cols-[1.4fr,1fr] items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
        {/* ── Copy ── */}
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-400">
            <span className="ornament" aria-hidden />
            For organizers
          </div>
          <h2 className="mt-4 font-display text-[28px] sm:text-[34px] md:text-[40px] font-extrabold leading-[1.05] tracking-tight">
            Got something your people should know about?
          </h2>
          <p className="mt-4 max-w-xl text-[15px] sm:text-[16px] text-white/85 leading-relaxed">
            Publish an event in five minutes from your phone. Sell on cards,
            Apple Pay, Google Pay, and mobile money — all in one checkout.
            Keep more of your revenue, keep your community close.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/events/new" className="btn btn-gold btn-lg">Host an event</Link>
            <Link href="/for-organizers" className="btn btn-outline-light btn-lg">Learn more</Link>
          </div>
        </div>

        {/* ── Feature tiles ──
            Three quick reasons to host. Hidden on mobile so the CTA copy
            stays the focus; reappears at md and stacks vertically. */}
        <ul className="hidden md:flex flex-col gap-3">
          {[
            { n: "01", t: "Five-minute setup",   b: "Publish on your phone, edit anytime." },
            { n: "02", t: "Cross-border checkout", b: "Cards, mobile money, and local rails in one flow." },
            { n: "03", t: "Fair fees",            b: "2.9% + $0.50 cards · 2.5% + $0.25 mobile." }
          ].map((f) => (
            <li
              key={f.n}
              className="flex gap-3.5 rounded-xl bg-nile-800 border border-nile-700 px-5 py-4"
            >
              <span className="font-display text-[20px] font-bold text-gold leading-none font-tabular shrink-0">
                {f.n}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-white">{f.t}</div>
                <div className="mt-1 text-[12.5px] text-white/85 leading-relaxed">{f.b}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
