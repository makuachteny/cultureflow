import Link from "next/link";
import type { ProfileGapReason } from "@/lib/auth";

/**
 * CompleteProfilePrompt — full-page block shown in place of a gated
 * surface (event creation, checkout, comment composer) when the user
 * hasn't finished setting up their profile yet.
 *
 * Styled deliberately as a stop-the-flow card, not a dismissible
 * banner: clicking through to /account is the only sensible next move.
 * The list of missing fields is rendered explicitly so the user knows
 * exactly what's needed instead of guessing.
 */

const REASON_COPY: Record<ProfileGapReason, { label: string; href: string }> = {
  name:             { label: "Add your full name",        href: "/account" },
  email_unverified: { label: "Verify your email address", href: "/account/change-email" },
  city:             { label: "Set your city",             href: "/account/contact-info" },
  bio:              { label: "Write a short organizer bio (20+ characters)", href: "/account" }
};

export default function CompleteProfilePrompt({
  missing,
  feature,
  cta = "Finish setting up"
}: {
  missing: ProfileGapReason[];
  /** Short label of what they were trying to do — drives the headline copy
   *  ("Finish your profile to create events", "…to buy a ticket", etc.). */
  feature: string;
  cta?: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white shadow-card ring-1 ring-[color:var(--border-hairline)] p-7 sm:p-9 text-center">
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-700"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 20a7 7 0 0114 0" />
        </svg>
      </span>

      <h1 className="mt-5 font-display text-[22px] sm:text-[26px] font-extrabold text-nile-900 tracking-tight">
        Finish your profile to {feature}
      </h1>
      <p className="mt-2 text-[14px] text-ink-600">
        We need a couple of details before you can keep going. It only takes a minute.
      </p>

      <ul className="mt-6 space-y-2 text-left">
        {missing.map((reason) => {
          const item = REASON_COPY[reason];
          return (
            <li key={reason}>
              <Link
                href={item.href}
                className="group flex items-center justify-between gap-3 rounded-lg ring-1 ring-[color:var(--border-hairline)] px-4 py-3 hover:ring-nile/40 motion-safe:transition-shadow"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nile-50 text-nile">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span className="text-[14px] font-semibold text-ink-900">{item.label}</span>
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500 group-hover:text-nile motion-safe:transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link href="/account" className="btn btn-primary mt-7 w-full sm:w-auto sm:min-w-[220px]">
        {cta}
      </Link>
    </div>
  );
}
