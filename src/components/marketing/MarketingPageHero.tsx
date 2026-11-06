import Link from "next/link";
import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * MarketingPageHero — the marketing hero chassis used on
 * /for-organizers, /pricing, /how-it-works, /for-attendees, /about.
 *
 * A rounded cream container with a big uppercase headline + subtitle +
 * CTAs on the left and a hero image on the right, floating on a warm
 * gradient backdrop. Breadcrumbs sit above.
 *
 * The hero image side is optional — if omitted, the headline spans the
 * full width for pages that don't need photography (e.g. /pricing).
 */
type CTA = { label: string; href: string; variant?: "solid" | "ghost" };

type Props = {
  crumbs: Array<{ label: string; href?: string }>;
  title: React.ReactNode;           // Render as <h1> inside
  subtitle?: React.ReactNode;
  ctas?: CTA[];
  imageSrc?: string;
  imageAlt?: string;
  /** Gradient family — all three resolve to brand-safe nile/gold ramps. */
  tone?: "warm" | "nile" | "gold";
};

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  warm: "linear-gradient(120deg, #FFF0B8 0%, #FFCE3A 35%, #8BAEE8 70%, #2E5CB8 100%)",
  nile: "linear-gradient(120deg, #DBE6FA 0%, #B9CDF2 40%, #5A88DA 80%, #2E5CB8 100%)",
  gold: "linear-gradient(120deg, #FFF9E5 0%, #FFCE3A 40%, #F5B800 75%, #D99F00 100%)"
};

export default function MarketingPageHero({
  crumbs,
  title,
  subtitle,
  ctas = [],
  imageSrc,
  imageAlt = "",
  tone = "warm"
}: Props) {
  return (
    <div className="relative" style={{ background: TONES[tone] }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-10 sm:pb-14">
        <div className={
          "rounded-2xl bg-cream-100 overflow-hidden grid items-stretch " +
          // 5/7 split on desktop — copy gets the larger left half (5)
          // and the photo carries the right side (7). At 4:3 aspect that
          // gives the image a comfortable landscape proportion that's
          // not square and not a thin band.
          (imageSrc ? "md:grid-cols-[5fr_7fr]" : "")
        }>
          <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            <h1 className="font-display font-extrabold text-[30px] sm:text-[40px] md:text-[48px] uppercase leading-[1.02] tracking-[-0.02em] text-ink-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 text-[15px] sm:text-[16px] text-ink-700 max-w-md leading-relaxed">
                {subtitle}
              </p>
            )}
            {ctas.length > 0 && (
              <div className="mt-6 sm:mt-7 flex flex-wrap gap-2.5">
                {ctas.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={
                      "inline-flex items-center justify-center rounded-full h-11 px-5 text-[14px] font-semibold transition-colors " +
                      (c.variant === "ghost"
                        ? "bg-ink-900/5 text-ink-900 hover:bg-ink-900/10"
                        : "bg-ink-900 text-white hover:bg-ink-800")
                    }
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {imageSrc && (
            // Aspect: 16:10 on mobile (banner-y). On md:+ the image
            // fills its grid cell (auto-aspect) with a min-height so the
            // photo never collapses when the copy column is short.
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] lg:min-h-[380px]">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 720px"
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
