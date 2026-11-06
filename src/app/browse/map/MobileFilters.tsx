"use client";

import { useEffect, useState } from "react";

/**
 * MobileFilters — bottom-sheet drawer wrapper for the map view filter
 * rail. Below lg the FilterSidebar would consume a full screen of
 * vertical space before the user reached the events list and map; on
 * touch viewports we collapse it behind a single "Filters" button and
 * pop the same content as a sheet that scrolls under the user's thumb.
 *
 * The trigger displays a count badge for active filter chips so the
 * user can see at a glance how many constraints are applied without
 * opening the sheet.
 */
export default function MobileFilters({
  chipCount,
  children
}: {
  chipCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="lg:hidden inline-flex w-full items-center justify-between gap-2 h-11 px-4 rounded-full bg-white border border-[color:var(--border-strong)] text-[14px] font-semibold text-ink-900 hover:bg-cream-100 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          Filters
        </span>
        {chipCount > 0 ? (
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-nile px-1.5 text-[11px] font-bold text-white">
            {chipCount}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className="lg:hidden fixed inset-0 z-50"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40 motion-safe:[animation:cf-fade-in_180ms_ease-out_both]"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] bg-cream-100 rounded-t-2xl shadow-2xl flex flex-col motion-safe:[animation:cf-slide-up_240ms_cubic-bezier(0.22,1,0.36,1)_both]">
            {/* Drag-handle hint — purely decorative; users still tap the
                close button or the backdrop to dismiss. */}
            <div aria-hidden className="mt-2 mx-auto h-1 w-10 rounded-full bg-ink-900/15" />

            <div className="flex items-center justify-between h-14 px-4 shrink-0">
              <h2 className="text-[18px] font-display font-bold text-ink-900">Filters</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-900/5 active:bg-ink-900/10 transition-colors -mr-2"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-[max(5rem,env(safe-area-inset-bottom))]">
              {children}
            </div>

            {/* Sticky footer: a single "View results" button that just
                closes the sheet — every filter row is a server-rendered
                <Link>, so the URL is already updated as the user taps.
                The button is the dismiss affordance, not a submit. */}
            <div className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-cream-100 border-t border-[color:var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center h-12 rounded-xl bg-nile-900 text-white text-[14.5px] font-semibold hover:bg-nile-800 transition-colors"
              >
                View results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
