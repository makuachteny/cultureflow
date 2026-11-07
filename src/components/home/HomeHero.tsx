import Link from "next/link";
import Image from "next/image";

/**
 * HomeHero — marketing hero used on "/" (home).
 *
 * A square white panel (copy + photo) on a field of uneven colour
 * blocks. Stacks on mobile, side by side from sm: up.
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
    // Backdrop = uneven vertical colour blocks (`bg-hero-sunrise`, hard
    // stops) — many colours side by side, for many communities.
    <div className="relative overflow-hidden bg-hero-sunrise border-b-2 border-ink">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-16">
        <div
          className={
            "relative bg-white border-[3px] border-ink shadow-[10px_10px_0_0_#000] grid items-stretch " +
            "lg:mx-[4%] " +
            (imageSrc ? "sm:grid-cols-[6fr_5fr]" : "")
          }
        >
          <div className="p-5 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center">
            {eyebrow && (
              <div className="self-start bg-gold border-2 border-ink px-2 py-0.5 text-[12px] sm:text-[13px] font-bold text-ink">
                {eyebrow}
              </div>
            )}
            <h1 className="font-display font-black text-[30px] sm:text-[40px] md:text-[48px] lg:text-[60px] leading-[0.98] text-ink mt-3 sm:mt-4 font-wide">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 sm:mt-5 text-[14px] sm:text-[16px] text-ink-700 max-w-md leading-relaxed">
                {subtitle}
              </p>
            )}
            {ctas.length > 0 && (
              <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-3">
                {ctas.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={"btn btn-lg " + (c.variant === "ghost" ? "btn-gold" : "btn-danger")}
                  >
                    <span className="sm:hidden">{c.shortLabel ?? c.label}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {imageSrc && (
            <div className="relative min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] border-t-[3px] sm:border-t-0 sm:border-l-[3px] border-ink">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 640px"
                className="object-cover object-center"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
