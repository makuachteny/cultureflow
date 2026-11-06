import Link from "next/link";
import Image from "next/image";

/**
 * HomeHero — marketing hero used on "/" (home).
 *
 * Mirrors `MarketingPageHero` (rounded cream panel + image on a warm
 * gradient backdrop) but without breadcrumbs, since home is the root.
 *
 * Layout: side-by-side at every viewport — text on the left, image on
 * the right. Mobile scales typography down and uses a 5fr_4fr split so
 * the headline and CTAs don't choke; desktop relaxes to 1:1.
 */
type CTA = {
  label: string;
  /** Optional short label rendered below sm: so mobile buttons stay
   *  compact ("Browse" instead of "Browse events"). Falls back to
   *  `label` when omitted. */
  shortLabel?: string;
  href: string;
  variant?: "solid" | "ghost";
};

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  ctas?: CTA[];
  imageSrc?: string;
  imageAlt?: string;
};

export default function HomeHero({
  eyebrow,
  title,
  subtitle,
  ctas = [],
  imageSrc,
  imageAlt = ""
}: Props) {
  return (
    // `bg-hero-sunrise` is defined in tailwind.config.ts (backgroundImage) so
    // the gold→nile gradient stays in one place and matches the rest of the
    // brand surfaces.
    <div className="relative bg-hero-sunrise">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12 lg:pt-14 pb-6 sm:pb-12 lg:pb-14">
        <div
          className={
            "rounded-xl sm:rounded-2xl bg-cream-100 overflow-hidden grid items-stretch " +
            // 50/50 split at every width — text and image share the
            // card evenly so the divide reads as proportional, not
            // text-heavy or image-heavy.
            (imageSrc ? "grid-cols-2" : "")
          }
        >
          <div className="p-4 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center">
            {eyebrow && (
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
                {eyebrow}
              </div>
            )}
            <h1 className="font-display font-extrabold text-[22px] sm:text-[32px] md:text-[40px] lg:text-[48px] uppercase leading-[1.05] sm:leading-[1.02] tracking-[-0.02em] text-ink-900 mt-1.5 sm:mt-2">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 sm:mt-4 text-[13px] sm:text-[15.5px] text-ink-700 max-w-md leading-snug sm:leading-relaxed">
                {subtitle}
              </p>
            )}
            {ctas.length > 0 && (
              // Buttons sit on a single row at every breakpoint. On
              // mobile we use the short label ("Browse", "Host") so two
              // pills always fit comfortably in a 50/50 column without
              // wrapping. Extra top spacing (mt-5) gives the CTAs visual
              // separation from the subtitle copy above.
              <div className="mt-5 sm:mt-6 flex flex-nowrap items-center gap-2 sm:gap-2.5">
                {ctas.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={
                      "inline-flex items-center justify-center rounded-full h-10 sm:h-11 px-4 sm:px-5 text-[13.5px] sm:text-[14.5px] font-semibold transition-colors whitespace-nowrap " +
                      (c.variant === "ghost"
                        ? "bg-ink-900/5 text-ink-900 hover:bg-ink-900/10"
                        : "bg-ink-900 text-white hover:bg-ink-800")
                    }
                  >
                    <span className="sm:hidden">{c.shortLabel ?? c.label}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {imageSrc && (
            // Image fills its grid cell — `aspect-auto` everywhere with
            // a sensible min-height per breakpoint so it never collapses.
            <div className="relative min-h-[180px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[380px]">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 720px"
                className="object-cover object-center"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
