/**
 * Inline notice banner with a leading icon circle. Used for "no cards
 * saved" / "no data" empty states inside a section. Muted grey palette.
 */
export default function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-cream-100 px-4 py-3 text-[14px] text-ink-800">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-ink-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
