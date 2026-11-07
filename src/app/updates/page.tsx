import type { Metadata } from "next";
import MarketingPageHero from "@/components/marketing/MarketingPageHero";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Updates",
  description: `Platform announcements, new features, and community news from ${BRAND_NAME}.`
};

/**
 * /updates — public changelog / announcements landing page.
 *
 * Header nav links here. Content is light — a short list of recent
 * milestones — kept evergreen-ish so we don't need a CMS yet.
 */
export default function UpdatesPage() {
  return (
    <>
      <MarketingPageHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Updates" }
        ]}
        title={<>What&rsquo;s new<br />on {BRAND_NAME}</>}
        subtitle="Platform announcements, new features, and community milestones — in chronological order."
        tone="warm"
      />

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <ul className="space-y-10">
            {ENTRIES.map((e) => (
              <li key={e.date}>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
                  {e.date}
                </div>
                <h2 className="mt-1.5 font-display text-[22px] sm:text-[26px] font-bold leading-[1.15] tracking-tight text-nile-900">
                  {e.title}
                </h2>
                <p className="mt-2 text-[15px] text-ink-700 leading-relaxed">
                  {e.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/* Curated, evergreen-friendly entries. Replace from a CMS or markdown
 * folder when the team wants to publish updates more frequently. */
const ENTRIES: Array<{ date: string; title: string; body: string }> = [
  {
    date: "April 2026",
    title: "Mobile-money checkout, end-to-end",
    body:
      "M-Pesa (KES), MTN MoMo (UGX/RWF/SSP), and m-Gurush (SSP) checkout flows are live. Buyers settle in their local currency; organizers get paid into their existing till / paybill / merchant code."
  },
  {
    date: "March 2026",
    title: "Calendar tear date badge + portrait poster cards",
    body:
      "Event listings refreshed to a more editorial, scannable layout. Cards show a stacked calendar-tear date, soft status pills, and a gold hover wash that signals interactivity without competing with the photo."
  },
  {
    date: "February 2026",
    title: "For-you feed and city pickers",
    body:
      "Signed-in attendees who finish onboarding get a personalized For-you feed on the home page, plus a quick city picker that filters every section without a full reload."
  },
  {
    date: "January 2026",
    title: "Public launch",
    body:
      "Discovery, ticketing, organizer payouts, and a community layer (profiles, follows, likes, event comments) — all in one place for communities of every culture."
  }
];
