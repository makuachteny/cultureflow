import Link from "next/link";
import Image from "next/image";

/**
 * HomeHero — marketing hero used on "/" (home).
 *
 * A square white panel (copy + photo) on the flag: black / red / green
 * bands with the blue hoist triangle and gold star. Stacks on mobile,
 * side by side from sm: up.
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

/** The flag's five-point star, as a clip-path so it stays a flat shape. */
const STAR =
  "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

export default function HomeHero({
  eyebrow,
  title,
  subtitle,
  ctas = [],
  imageSrc,
  imageAlt = ""
}: Props) {
  return (
    // Backdrop = the South Sudanese flag: black / red / green bands with
    // white fimbriation (`bg-hero-sunrise`, hard stops), and the blue
    // hoist triangle carrying the gold star cutting in from the left.
    <div className="relative overflow-hidden bg-hero-sunrise border-b-2 border-ink">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[46%] sm:w-[34%] bg-white"
        style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[44%] sm:w-[32.5%] bg-nile"
        style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
      />
      <div
        aria-hidden
        className="absolute left-[3%] sm:left-[6%] top-1/2 -translate-y-1/2 h-14 w-14 sm:h-24 sm:w-24 bg-gold"
        style={{ clipPath: STAR }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-16">
        <div
          className={
            "relative bg-white border-[3px] border-ink shadow-[10px_10px_0_0_#000] grid items-stretch " +
            "sm:ml-[10%] lg:ml-[14%] " +
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
