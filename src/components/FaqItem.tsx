/**
 * FaqItem — collapsible FAQ row using native <details>/<summary>.
 *
 * Why native
 *   • Zero client JS: server-renderable, accessible out of the box
 *     (keyboard + screen reader support, aria-expanded handled by browser).
 *   • Open state is real DOM state, not React state — works even if JS
 *     fails to hydrate (rare, but matters for SEO crawlers and old links).
 *
 * Behavior
 *   • Click / tap / Enter / Space on the summary toggles open.
 *   • Chevron rotates 180° on open (CSS-only).
 *   • Content fades + expands with a 200ms ease.
 *
 * See DESIGN_REFINE_V2 §10 — replaces the open-always FAQ cards.
 */
type Props = {
  q: string;
  a: React.ReactNode;
  /** If true, render open on initial load. Useful for "most asked" FAQs. */
  defaultOpen?: boolean;
};

export default function FaqItem({ q, a, defaultOpen = false }: Props) {
  return (
    <details
      className="group rounded-md bg-white shadow-sm open:shadow-card motion-safe:transition-shadow motion-safe:duration-200"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-[15px] font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{q}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-ink-500 motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-5 text-[13px] leading-relaxed text-ink-700">
        {a}
      </div>
    </details>
  );
}
