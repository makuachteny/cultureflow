"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Collapsible long-form event description. Renders at a fixed max-height
 * with a bottom-edge blur fade and a "Read more" pill. Clicking expands
 * to full height; the fade disappears and the label flips to "Show less".
 *
 * Short overviews (shorter than `collapsedMaxPx`) bypass the collapse
 * entirely — no blur, no button — so there's no fake fade on a
 * paragraph that already fits.
 *
 * Why client-side: we measure the content's intrinsic height to decide
 * whether a collapse is even needed. Server can't know.
 */
export default function EventOverview({
  summary,
  description,
  collapsedMaxPx = 280
}: {
  summary: string;
  description?: string | null;
  collapsedMaxPx?: number;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      setNeedsCollapse(el.scrollHeight > collapsedMaxPx + 40);
    };
    measure();
    // Re-measure on resize (font-load reflow etc.)
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsedMaxPx, summary, description]);

  const isCollapsed = needsCollapse && !expanded;

  return (
    <div className="mt-4">
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{
          maxHeight: isCollapsed ? `${collapsedMaxPx}px` : "9999px"
        }}
      >
        <div ref={innerRef}>
          <p className="text-[16px] leading-[1.7] text-ink-800 whitespace-pre-line">
            {summary}
          </p>
          {description && description.trim() !== summary.trim() && (
            <div className="mt-4 text-[15px] leading-[1.7] text-ink-700 whitespace-pre-line">
              {description}
            </div>
          )}
        </div>

        {/* Bottom blur fade — only while collapsed. Fades from transparent
            at the top of the strip to the page bg at the very bottom so
            the final line of text dissolves instead of getting sliced. */}
        {isCollapsed && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{
              background:
                "linear-gradient(180deg, rgba(252,252,250,0) 0%, rgba(252,252,250,0.85) 55%, rgba(252,252,250,1) 100%)"
            }}
          />
        )}
      </div>

      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-nile hover:text-nile-700 motion-safe:transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <svg
            viewBox="0 0 24 24"
            className={
              "h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-200 " +
              (expanded ? "rotate-180" : "")
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
