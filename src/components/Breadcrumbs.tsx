import Link from "next/link";
import { safeJsonLd } from "@/lib/jsonld";

/**
 * Breadcrumbs — compact nav trail above page titles
 * (Home / Online Events / All Events).
 *
 * • Last item renders as plain text (current page, not a link).
 * • All other items render as Links.
 * • Emits the `BreadcrumbList` JSON-LD for SEO.
 */
type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items?.length) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: c.href } : {})
    }))
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-600">
        {/* Generous gap-3 between every item (text and chevron) so the
            trail breathes — the previous gap-2 had labels visually
            crowding the separator. */}
        <ol className="flex flex-wrap items-center gap-3">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={`${c.label}-${c.href ?? "current"}`} className="flex items-center gap-3">
                {c.href && !last ? (
                  <Link href={c.href} className="font-semibold text-ink-700 hover:text-nile hover:underline transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className={last ? "font-semibold text-ink-900" : "text-ink-600"}>{c.label}</span>
                )}
                {!last && (
                  <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
    </>
  );
}
