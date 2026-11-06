import Link from "next/link";
import PageHeader from "@/components/organizer/PageHeader";
import { TEMPLATES, type EventTemplate } from "@/lib/templates";

export const metadata = { title: "Event templates" };

/**
 * /dashboard/events/templates — pick a starter template and jump into
 * the new-event form with title, summary, description, category, type,
 * and ticket tiers already filled in. Dates and venue are still required
 * (they're unique per event).
 */
export default function EventTemplatesPage() {
  return (
    <div className="w-full">
      <PageHeader
        eyebrow="New event"
        title="Start from a template"
        subtitle="Pick the pattern closest to what you're running. You'll land on the event form with copy and ticket tiers pre-filled — edit freely from there."
      />

      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-nile hover:text-nile-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Start blank instead
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.slug} t={t} />
        ))}
      </div>
    </div>
  );
}

const TONE_BG: Record<EventTemplate["tone"], string> = {
  nile:     "bg-nile-50     text-nile",
  gold:     "bg-gold-50     text-gold-700",
  acacia:   "bg-acacia-50   text-acacia-600",
  clay:     "bg-[#FCE9D4]   text-clay",
  hibiscus: "bg-[#FDE5E5]   text-hibiscus",
  ink:      "bg-ink-300/40  text-ink-800"
};

function TemplateCard({ t }: { t: EventTemplate }) {
  const paidTiers = t.preset.tiers.filter((x) => x.priceCents > 0).length;
  return (
    <Link
      href={`/dashboard/events/new?template=${t.slug}`}
      className="group card p-5 surface-hover flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${TONE_BG[t.tone]}`} aria-hidden>
          <span>{t.emoji}</span>
        </div>
        <span className="inline-flex items-center rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">
          {t.category.replace("_", " ")}
        </span>
      </div>
      <h3 className="mt-4 font-display text-[17px] font-bold text-nile-900 leading-tight">
        {t.name}
      </h3>
      <p className="mt-1.5 text-[13px] text-ink-600 leading-relaxed">{t.tagline}</p>

      <div className="mt-auto pt-5 flex items-center justify-between text-[12px] text-ink-500">
        <span>
          {t.preset.tiers.length} tier{t.preset.tiers.length === 1 ? "" : "s"}
          {paidTiers === 0 ? " · free" : paidTiers < t.preset.tiers.length ? " · mixed" : " · paid"}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-nile group-hover:underline">
          Use template
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
