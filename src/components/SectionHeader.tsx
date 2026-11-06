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
          <div className="inline-flex items-center bg-ink text-gold px-2 py-0.5 text-[12px] font-bold">
            {eyebrow}
          </div>
        )}
        <h2
          className={
            (eyebrow ? "mt-3 " : "") +
            "font-display text-[28px] sm:text-[34px] md:text-[40px] font-black text-ink leading-[1.0]"
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
          className="group inline-flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-1.5 text-[13px] font-bold text-ink shadow-sm hover:bg-gold motion-safe:transition-colors"
        >
          <span>
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
