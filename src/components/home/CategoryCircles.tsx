"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { CATEGORIES } from "@/lib/taxonomy";
import CategoryGlyph from "@/components/CategoryGlyph";

/**
 * CategoryCircles — horizontal rail of square category tiles: photo on
 * top, a solid flag-colour label bar underneath. (Name kept for imports;
 * they were circles before the flag redesign.)
 */
/** Label-bar colours, cycling through the flag. */
const TILE_TONES = [
  "bg-hibiscus text-white",
  "bg-gold text-ink",
  "bg-nile text-white",
  "bg-acacia text-white",
  "bg-ink text-white"
];

export default function CategoryCircles() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10 sm:mt-14 mb-8 sm:mb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex bg-ink text-gold px-2 py-0.5 text-[12px] font-bold">Discover</div>
          <h2 className="mt-3 font-display text-[28px] sm:text-[40px] font-black text-ink leading-[1.0]">
            Browse by category
          </h2>
        </div>
        <p className="max-w-sm text-[14px] text-ink-700">
          Twelve ways people gather. Pick a thread.
        </p>
      </div>

      <div className="relative mt-6 sm:mt-8">
        <div
          ref={trackRef}
          className={
            "flex gap-3 sm:gap-4 pb-3 pr-3 " +
            "overflow-x-auto scroll-smooth snap-x snap-mandatory " +
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          {CATEGORIES.map((c, i) => {
            const tone = TILE_TONES[i % TILE_TONES.length];
            return (
              <Link
                key={c.slug}
                /* Straight to /browse pre-filtered by this category. The
                 * /events/category/<slug> SEO page still exists. */
                href={`/browse?category=${c.key}`}
                aria-label={`Browse ${c.label} events`}
                className={
                  "group snap-start shrink-0 w-[124px] sm:w-[156px] border-2 border-ink bg-white shadow-pop " +
                  "motion-safe:transition-transform motion-safe:duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000]"
                }
              >
                <span className="relative block aspect-square overflow-hidden border-b-2 border-ink">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 124px, 156px"
                    className="object-cover"
                  />
                </span>
                <span className={"flex items-center gap-2 px-2.5 py-2 " + tone}>
                  <CategoryGlyph slug={c.slug} size={18} />
                  <span className="text-[13px] sm:text-[14px] font-bold leading-tight truncate">{c.label}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Desktop scroll arrows — float over the edge-fade gradient. */}
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll categories left"
          className="hidden md:flex absolute -left-3 top-[66px] z-[3] h-10 w-10 items-center justify-center border-2 border-ink bg-white shadow-pop hover:bg-gold text-ink transition"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll categories right"
          className="hidden md:flex absolute -right-3 top-[66px] z-[3] h-10 w-10 items-center justify-center border-2 border-ink bg-white shadow-pop hover:bg-gold text-ink transition"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}

/* The per-slug glyphs live in `src/components/CategoryGlyph.tsx` so they
   can be reused by EventCard's category line. */
