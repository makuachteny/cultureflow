/**
 * CategoryGlyph — single line-art icon per event category.
 *
 * Used in both `CategoryCircles` (the home rail, 28px discs) and
 * `EventCard` (the per-card meta line, 14px). The viewBox is fixed at
 * 0–28 so callers can resize freely via the `size` prop without breaking
 * proportion, and `currentColor` lets parents control the colour through
 * Tailwind text utilities.
 *
 * Slugs match the lowercase EventCategory enum values from
 * `lib/taxonomy.ts` — anything unknown falls through to the generic
 * info-circle glyph.
 */
type Props = { slug: string; size?: number; className?: string };

export default function CategoryGlyph({ slug, size = 28, className }: Props) {
  const p = {
    viewBox: "0 0 28 28",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className
  };
  switch (slug) {
    case "music":
      return <svg {...p}><path d="M10 20V7l11-2v13" /><circle cx="7" cy="20" r="3" /><circle cx="18" cy="18" r="3" /></svg>;
    case "sports":
      return <svg {...p}><circle cx="14" cy="14" r="10" /><path d="M4 14h20M14 4a18 18 0 010 20M14 4a18 18 0 000 20" /></svg>;
    case "education":
      return <svg {...p}><path d="M3 9l11-5 11 5-11 5-11-5z" /><path d="M25 9v7M7 11v6c0 2.2 3.1 3.5 7 3.5s7-1.3 7-3.5v-6" /></svg>;
    case "faith":
      return <svg {...p}><path d="M14 4v20M8 11h12" /></svg>;
    case "networking":
      return <svg {...p}><circle cx="10" cy="9" r="3.5" /><circle cx="19" cy="11" r="3" /><path d="M3 23c0-3.5 3.5-6 7-6s7 2.5 7 6" /><path d="M15 23c0-2 2-4 3.5-4s3.5 2 3.5 4" /></svg>;
    case "wedding":
      return <svg {...p}><path d="M14 24s-8-5.5-8-12.5a5.5 5.5 0 0111-1 5.5 5.5 0 0111 1c0 7-8 12.5-8 12.5" /></svg>;
    case "community":
      return <svg {...p}><circle cx="14" cy="9" r="3.5" /><path d="M5 23c0-4.5 4.5-7 9-7s9 2.5 9 7" /></svg>;
    case "business":
      return <svg {...p}><rect x="4" y="8" width="20" height="15" rx="2" /><path d="M9 8V6a2 2 0 012-2h6a2 2 0 012 2v2" /><path d="M4 14h20" /></svg>;
    case "fundraiser":
      return <svg {...p}><path d="M23 14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8" /><rect x="3" y="8" width="22" height="6" rx="1" /><path d="M14 24V8M14 8s-3-5 0-5 5 5 0 5M14 8s3-5 0-5-5 5 0 5" /></svg>;
    case "family":
      return <svg {...p}><circle cx="9" cy="8" r="3.5" /><circle cx="20" cy="9" r="3" /><path d="M3 24c0-4.5 3-7 7-7s7 2.5 7 7" /><path d="M16 24c0-3 2-4.5 3.5-4.5s3.5 1.5 3.5 4.5" /></svg>;
    case "cultural":
      return <svg {...p}><path d="M14 3l3 6 6 .9-4.4 4.3 1 6.2L14 17.5l-5.6 2.9 1-6.2L5 9.9l6-.9z" /></svg>;
    default:
      return <svg {...p}><circle cx="14" cy="14" r="10" /><path d="M10 11h8M10 15h5" /></svg>;
  }
}
