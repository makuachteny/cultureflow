/**
 * Shared page-header block for every dashboard page.
 *
 * Locks down the eyebrow → h1 → subtitle rhythm so pages stay proportional
 * as copy changes. `actions` slots on the right (e.g. a filter pill or
 * "Export CSV" button) and baseline-aligns to the headline.
 *
 *   [ eyebrow ]                                        [actions]
 *   Title                                              [ (right)]
 *   Subtitle copy up to two lines, max-w-2xl
 *   ────────────────── 40px gap before content ──────────────────
 */
type Props = {
  /** Small uppercase label above the title. Omit to skip. */
  eyebrow?: string;
  /** Main display title — rendered as <h1>. */
  title: React.ReactNode;
  /** Optional subtitle paragraph under the title. */
  subtitle?: React.ReactNode;
  /** Right-aligned action slot (e.g. buttons or filter pills). */
  actions?: React.ReactNode;
};

export default function PageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-700">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-2 font-display text-[32px] sm:text-[40px] font-extrabold tracking-tight leading-[1.05] text-nile-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-[14.5px] text-ink-600 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
