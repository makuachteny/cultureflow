/**
 * Root route loading fallback. Renders between navigations or while
 * server components resolve. Kept calm — a quiet gold pulse inside a
 * white pill on the page background, not a full-screen spinner.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 flex justify-center">
      <div
        className="inline-flex items-center gap-3 rounded-full bg-white shadow-sm px-5 py-3"
        aria-label="Loading"
        role="status"
      >
        <span className="pulse-dot bg-gold" />
        <span className="text-[13px] font-semibold text-ink-700">Loading…</span>
      </div>
    </div>
  );
}
