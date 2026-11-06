/**
 * DashboardHero — solid banner that opens every organizer page.
 *
 * Flat UI: solid gradient background, no glassmorphism. Translucent
 * white overlays read as "fancy but slow" — replaced with proper
 * hierarchy via ring + tinted-on-tone surfaces.
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │ DASHBOARD                                                        │
 *  │ Title with a gold accent fragment.                               │
 *  │ Lede paragraph. Up to two short sentences.                       │
 *  │ [ Primary CTA ]  [ Secondary CTA ]                  [ KPI pill ] │
 *  └──────────────────────────────────────────────────────────────────┘
 */

import Link from "next/link";

type CTA = {
  label:   string;
  href:    string;
  /** "primary" → gold pill, "ghost" → solid outlined ghost on the banner. */
  variant: "primary" | "ghost";
};

type KPI = {
  /** Small uppercase eyebrow above the value. */
  label:    string;
  /** Big tabular-numeric value (already formatted). */
  value:    string;
  /** Quiet supporting line. */
  caption?: string;
};

type Tone = "nile" | "gold" | "acacia" | "hibiscus";

const GRADIENT: Record<Tone, string> = {
  // Brand-aligned organiser pitch — same gradient the home page uses.
  nile:     "var(--gradient-organizer-pitch)",
  // Warm sunset for revenue-themed pages (Finance, Reports).
  gold:     "linear-gradient(135deg,#7E5A0E 0%,#B8770C 45%,#1B3A85 100%)",
  // Cool fresh green for growth-themed pages (Marketing).
  acacia:   "linear-gradient(135deg,#0E5E40 0%,#1FA974 50%,#1B3A85 100%)",
  // Warm coral for irreversible / high-stakes (Refunds, Payouts).
  hibiscus: "linear-gradient(135deg,#7E1E1E 0%,#E44C4C 45%,#1B3A85 100%)"
};

export default function DashboardHero({
  tone     = "nile",
  eyebrow,
  title,
  accent,
  lede,
  ctas     = [],
  kpi
}: {
  tone?:    Tone;
  eyebrow:  string;
  /** Main title text. */
  title:    string;
  /** Optional fragment appended to the title in gold. */
  accent?:  string;
  lede?:    string;
  ctas?:    CTA[];
  kpi?:     KPI;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl text-white shadow-sm mb-8"
      style={{ background: GRADIENT[tone] }}
    >
      <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:p-10 xl:grid-cols-[1fr,auto] xl:items-end">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-nile-900/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-400">
            {eyebrow}
          </span>
          <h1 className="mt-4 font-display text-[28px] sm:text-[36px] lg:text-[44px] font-extrabold tracking-tight leading-[1.05]">
            {title}
            {accent && (
              <>
                {" "}
                <span className="text-gold-400">{accent}</span>
              </>
            )}
          </h1>
          {lede && (
            <p className="mt-3 max-w-2xl text-[15px] text-white/85 leading-relaxed">
              {lede}
            </p>
          )}
          {ctas.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {ctas.map((c) => (
                <Link
                  key={c.label + c.href}
                  href={c.href}
                  className={
                    c.variant === "primary"
                      ? "btn btn-gold"
                      : "inline-flex items-center gap-1.5 rounded-md border border-white/40 px-4 h-10 text-[14px] font-semibold text-white hover:bg-nile-900/40 transition-colors"
                  }
                >
                  {c.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {kpi && (
          <div className="shrink-0 rounded-xl border border-gold-400/30 bg-nile-900/40 p-5 xl:min-w-[260px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
              {kpi.label}
            </div>
            <div className="mt-1.5 font-display text-[32px] sm:text-[36px] font-extrabold tracking-tight text-gold-400 font-tabular">
              {kpi.value}
            </div>
            {kpi.caption && (
              <div className="mt-1 text-[13px] text-white/75">
                {kpi.caption}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
