import Link from "next/link";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
};

/**
 * Section heading used on the home page + marketing pages.
 *
 * The H2 leads with a small vertical accent bar (same treatment as the
 * event-detail `SectionTitle`) so every section title across the app
 * carries one consistent typographic signature.
 */
export default function SectionHeader({ eyebrow, title, subtitle, action }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">
            {/* Small gold rule + ornament before the eyebrow — a single
                editorial flourish that anchors the section without
                touching the headline weight. */}
            <span className="h-px w-8 bg-gold rounded-full" aria-hidden />
            <span>{eyebrow}</span>
          </div>
        )}
        <h2
          className={
            (eyebrow ? "mt-3 " : "") +
            "font-display text-[26px] sm:text-[32px] md:text-[36px] font-extrabold text-nile-900 leading-[1.05] tracking-tight"
          }
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-[15px] sm:text-[16px] text-ink-700 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-nile hover:text-nile-700 motion-safe:transition-colors"
        >
          <span className="border-b-[1.5px] border-transparent group-hover:border-nile-700 motion-safe:transition-colors pb-0.5">
            {action.label}
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 motion-safe:transition-transform group-hover:translate-x-1"
            fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}
