import Link from "next/link";

type Action = { label: string; href: string };

type Props = {
  title: string;
  body?: string;
  primary?: Action;
  secondary?: Action;
  /** Pick a preset illustration. Defaults to "calendar". */
  illustration?: "calendar" | "drum" | "map" | "spark";
};

/**
 * Warm, branded empty state. Used in place of ad-hoc "nothing here yet"
 * cards across the app. The illustration is a subtle tinted circle with
 * a brand-weighted icon — intentionally geometric, not cartoonish, so it
 * reads as editorial chrome rather than a cheap clipart badge.
 */
export default function EmptyState({
  title,
  body,
  primary,
  secondary,
  illustration = "calendar"
}: Props) {
  return (
    <div className="rounded-md bg-white shadow-sm px-6 py-12 sm:px-10 sm:py-16 text-center">
      <div className="mx-auto flex flex-col items-center max-w-md">
        <Illustration kind={illustration} />
        <h3 className="mt-5 font-display text-[22px] sm:text-[26px] font-semibold text-nile-900 leading-tight">
          {title}
        </h3>
        {body && (
          <p className="mt-2 text-[14px] sm:text-[15px] text-ink-600 leading-relaxed">
            {body}
          </p>
        )}
        {(primary || secondary) && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {primary && (
              <Link href={primary.href} className="btn btn-primary">
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className="btn btn-outline">
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Illustration({ kind }: { kind: NonNullable<Props["illustration"]> }) {
  const ringCls =
    "relative h-20 w-20 grid place-items-center shadow-pop " +
    "bg-gold border-2 border-ink";

  if (kind === "drum") {
    return (
      <div className={ringCls}>
        <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="24" cy="14" rx="12" ry="4" className="text-gold" />
          <path d="M12 14v20c0 2.2 5.4 4 12 4s12-1.8 12-4V14" className="text-nile" />
          <path d="M18 18l-2 18M30 18l2 18" className="text-gold" />
        </svg>
      </div>
    );
  }
  if (kind === "map") {
    return (
      <div className={ringCls}>
        <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 42s-12-12-12-22a12 12 0 1 1 24 0c0 10-12 22-12 22z" className="text-nile" />
          <circle cx="24" cy="20" r="4.5" className="text-gold" />
        </svg>
      </div>
    );
  }
  if (kind === "spark") {
    return (
      <div className={ringCls}>
        <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 6v8M24 34v8M6 24h8M34 24h8M12 12l6 6M30 30l6 6M36 12l-6 6M18 30l-6 6" className="text-gold" />
          <circle cx="24" cy="24" r="5" className="text-gold" />
        </svg>
      </div>
    );
  }
  // calendar (default)
  return (
    <div className={ringCls}>
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="10" width="32" height="30" rx="3" className="text-nile" />
        <path d="M8 18h32" className="text-nile" />
        <path d="M16 6v8M32 6v8" className="text-gold" />
        <circle cx="24" cy="28" r="2.5" fill="currentColor" className="text-gold" stroke="none" />
      </svg>
    </div>
  );
}
