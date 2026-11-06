import Link from "next/link";

type Related = { href: string; label: string };

type Props = {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
  related?: Related[];
};

/**
 * Shared chrome for legal/policy pages. Enforces the canonical editorial
 * scale (H1 32→40px extrabold, H2 18px bold, ink-700 body, 13px meta)
 * so terms/privacy/refunds don't each drift into their own typography.
 */
export default function LegalPage({ eyebrow, title, updated, children, related }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 text-[15px] text-ink-700 leading-[1.7]">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
        {eyebrow}
      </div>
      <h1 className="mt-2 font-display text-[32px] sm:text-[40px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
        {title}
      </h1>
      <p className="mt-3 text-[13px] text-ink-500">Last updated: {updated}</p>

      <div className="mt-8 space-y-5 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-nile-900 [&_h2]:tracking-tight [&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-nile [&_a]:font-semibold hover:[&_a]:underline">
        {children}
      </div>

      {related && related.length > 0 && (
        <p className="mt-12 text-[13px] text-ink-500">
          See also:{" "}
          {related.map((r, i) => (
            <span key={r.href}>
              <Link href={r.href} className="text-nile font-semibold hover:underline">
                {r.label}
              </Link>
              {i < related.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
