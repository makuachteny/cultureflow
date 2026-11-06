import Link from "next/link";
import { redirect } from "next/navigation";
import EventForm from "@/components/EventForm";
import CompleteProfilePrompt from "@/components/CompleteProfilePrompt";
import { findTemplate } from "@/lib/templates";
import { auth, checkProfileCompleteness } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SP = { template?: string; ai?: string };

/**
 * /dashboard/events/new — the dashboard home for creating an event.
 *
 * Auth is enforced by middleware (everything under /dashboard requires
 * sign-in). The dashboard layout already supplies the sidebar + topbar
 * chrome, so this page just lays out a lightweight sub-sidebar (draft
 * status + 3-step progress) and the existing EventForm.
 *
 * Before the form even renders we check the user's profile is fully
 * set up — organizers without a name / city / bio shouldn't be
 * publishing events whose detail page would render half-empty.
 *
 * When `?template=<slug>` is supplied, we look up the template and pass
 * its preset into EventForm so the user lands on a mostly-filled form.
 */
export default async function DashboardNewEventPage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/events/new");

  const profile = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { name: true, email: true, emailVerified: true, city: true, bio: true, role: true }
  });
  const status = profile ? checkProfileCompleteness(profile) : { complete: false, missing: ["name" as const] };

  if (!status.complete) {
    return (
      <div className="py-8">
        <CompleteProfilePrompt
          missing={status.missing}
          feature="create an event"
          cta="Complete profile to continue"
        />
      </div>
    );
  }

  const template     = findTemplate(searchParams?.template);
  const fromTemplate = !!template;
  const fromAi       = searchParams?.ai === "1";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Top row — back link + draft pill */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-nile hover:text-nile-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back to events
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-700">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
          Draft
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-8">
        {/* Left — draft card + steps */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-xl bg-white border border-[color:var(--border-hairline)] p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
              New event
            </div>
            <h2 className="mt-1.5 font-display text-[18px] font-extrabold text-nile-900 leading-tight tracking-tight">
              Untitled event
            </h2>
            <p className="mt-1 text-[12px] text-ink-500">Not published yet</p>
          </div>

          <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500 px-1">
            Steps
          </div>
          <ol className="mt-2 space-y-1.5">
            <Step n={1} title="Build event page" body="Add details and let attendees know what to expect" active />
            <Step n={2} title="Add tickets"      body="Price tiers, quantities, refunds" />
            <Step n={3} title="Publish"          body="Share the link and start selling" />
          </ol>
        </aside>

        {/* Right — the form */}
        <main className="min-w-0">
          {(fromTemplate || fromAi) && (
            <div
              role="note"
              className="mb-5 rounded-md bg-gold-50 px-5 py-4 flex items-start gap-4 shadow-sm ring-1 ring-gold-100"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-nile-900 text-xl" aria-hidden>
                {template
                  ? <span>{template.emoji}</span>
                  : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />
                    </svg>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-nile-900">
                  {template ? `Using the ${template.name} template` : "AI-assisted creation"}
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">
                  {fromTemplate
                    ? "Title, description, and ticket tiers are pre-filled — edit anything below. Set dates, venue, and banner to finish."
                    : "AI event drafting is in beta. For now, fill in the form below and we’ll bring the AI assist to this screen shortly."}
                </p>
              </div>
              {fromTemplate && (
                <Link href="/dashboard/events/templates" className="shrink-0 text-[13px] font-semibold text-nile hover:underline self-center">
                  Change template
                </Link>
              )}
            </div>
          )}

          <EventForm preset={template?.preset} />
        </main>
      </div>
    </div>
  );
}

function Step({
  n, title, body, active
}: {
  n: number; title: string; body: string; active?: boolean;
}) {
  return (
    <li
      className={
        "rounded-lg p-4 transition-colors " +
        (active
          ? "bg-nile-50 ring-1 ring-nile"
          : "border border-[color:var(--border-hairline)] bg-white/60")
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "h-6 w-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-tabular " +
            (active ? "bg-nile text-white" : "bg-ink-400/40 text-ink-700")
          }
          aria-hidden
        >
          {n}
        </div>
        <div>
          <div
            className={
              "font-semibold text-[14px] leading-tight " +
              (active ? "text-nile-900" : "text-ink-700")
            }
          >
            {title}
          </div>
          <div className="text-[12px] text-ink-500 mt-1 leading-snug">{body}</div>
        </div>
      </div>
    </li>
  );
}
