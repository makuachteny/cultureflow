"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { CATEGORIES } from "@/lib/taxonomy";
import { categoryAccent } from "@/lib/events";
import CategoryGlyph from "@/components/CategoryGlyph";

/**
 * CategoryCircles — centered category rail.
 * Each circle is a clean white disc with a nile-ink icon at rest, but on
 * hover the disc + icon flip to that category's accent color (gold for
 * cultural, hibiscus for music, acacia for community, etc.). The row
 * stays calm at rest and lights up under interaction so the page reads
 * with energy without going carnival.
 */
export default function CategoryCircles() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 mb-6 sm:mb-10">
      {/* Centered section header — tightened on mobile so the rail sits
          closer to the page rhythm, then relaxes on sm:+ for desktop. */}
      <div className="text-center">
        <div className="eyebrow justify-center">◆ Discover</div>
        <h2 className="mt-1.5 sm:mt-2 font-display text-[22px] sm:text-[32px] font-bold text-nile-900 leading-tight tracking-tight">
          Browse by category
        </h2>
        <div aria-hidden className="mx-auto mt-2 sm:mt-3 h-[3px] w-12 sm:w-14 rounded-full bg-gradient-to-r from-gold via-nile to-gold" />
        <p className="mx-auto mt-2.5 sm:mt-4 max-w-lg text-[13.5px] sm:text-[14px] text-ink-600">
          Twelve ways the tribe gathers. Pick a thread.
        </p>
      </div>

      {/* Top margin halved on mobile (mt-5) so the rail starts right
          under the lede; restored to mt-10 on sm:+. */}
      <div className="relative mt-5 sm:mt-10">
        {/* Edge fades so off-screen circles dissolve under a gradient
            instead of clipping hard. Shown on every breakpoint because the
            rail is always horizontally scrollable — never wraps. */}
        <div aria-hidden className="pointer-events-none absolute top-0 left-0 h-full w-6 sm:w-10 bg-gradient-to-r from-[var(--color-bg)] to-transparent z-[1]" />
        <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-full w-6 sm:w-10 bg-gradient-to-l from-[var(--color-bg)] to-transparent z-[1]" />

        <div
          ref={trackRef}
          className={
            "flex gap-2.5 sm:gap-4 py-1 sm:py-3 px-6 sm:px-10 " +
            "overflow-x-auto scroll-smooth snap-x snap-mandatory " +
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          {CATEGORIES.map((c) => {
            const accent = categoryAccent(c.slug);
            return (
              <Link
                key={c.slug}
                /* Click goes straight to /browse pre-filtered by this
                 * category — same cards, same time/format/price/sort
                 * filters, same Grid/List/Map toggle as Find Events.
                 * The dedicated /events/category/<slug> SEO landing
                 * page still exists for organic traffic; the home rail
                 * just sends the user to the live filterable surface. */
                href={`/browse?category=${c.key}`}
                aria-label={`Browse ${c.label} events`}
                className="group snap-start shrink-0 flex flex-col items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30"
              >
                {/* Disc — photo-backed circle with a soft inky vignette so
                    the white glyph overlay reads cleanly. 72 px on mobile,
                    88 px from sm:+. Hover lifts the disc, deepens the
                    shadow, and tints the ring to the category accent so
                    the row goes from quiet at rest to lit on touch. */}
                <span
                  className={
                    "relative flex h-[72px] w-[72px] sm:h-[88px] sm:w-[88px] items-center justify-center rounded-full overflow-hidden " +
                    "ring-1 ring-ink-900/10 shadow-sm " +
                    "motion-safe:transition-all motion-safe:duration-300 ease-out " +
                    "motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:scale-[1.05] " +
                    "group-hover:shadow-card " + accent.hoverBg
                  }
                >
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 72px, 88px"
                    className="object-cover motion-safe:transition-transform motion-safe:duration-500 ease-out motion-safe:group-hover:scale-110"
                  />
                  {/* Vignette — keeps the photo readable while letting the
                      glyph stay legible against any underlying scene. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/15 via-ink-900/30 to-ink-900/55"
                  />
                  <span className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                    <CategoryGlyph slug={c.slug} size={24} className="sm:hidden" />
                    <CategoryGlyph slug={c.slug} size={28} className="hidden sm:block" />
                  </span>
                </span>

                <span className="relative inline-flex flex-col items-center">
                  <span className="text-[12px] sm:text-[13px] font-semibold text-ink-800 group-hover:text-nile-900 max-w-[88px] sm:max-w-[100px] text-center leading-tight motion-safe:transition-colors">
                    {c.label}
                  </span>
                  <span
                    aria-hidden
                    className={"mt-1 h-[2px] w-0 rounded-full motion-safe:transition-all motion-safe:duration-300 group-hover:w-6 " + accent.dot}
                  />
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
          className="hidden md:flex absolute left-0 top-[44px] z-[3] h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-hairline)] bg-white shadow-card hover:bg-cream-100 text-nile-800 transition"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll categories right"
          className="hidden md:flex absolute right-0 top-[44px] z-[3] h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-hairline)] bg-white shadow-card hover:bg-cream-100 text-nile-800 transition"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}

/* The per-slug glyphs live in `src/components/CategoryGlyph.tsx` so they
   can be reused by EventCard's category line. */
