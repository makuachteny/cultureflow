import Link from "next/link";
import { BRAND_ASPECTS, BRAND_HOME_LABEL, BRAND_LOGOS, BRAND_NAME } from "@/lib/brand";
import BrandMark from "./brand/BrandMark";

/**
 * Logo — the canonical brand lockup. Renders one of the pre-built
 * SVG variants from /public so layout, kerning, and colour stay
 * pixel-faithful to the master `/logo.svg`.
 *
 *   <Logo />                       horizontal lockup (mark + wordmark)
 *   <Logo variant="stacked" />     mark above wordmark
 *   <Logo variant="mark" />        just the mark
 *   <Logo tone="white" />          reversed, for dark surfaces
 */

type Variant = "horizontal" | "stacked" | "mark";

type Tone = "color" | "black" | "white";

const SRC: Record<Variant, Record<Tone, string>> = {
  horizontal: { color: BRAND_LOGOS.horizontal, black: BRAND_LOGOS.horizontalBlack, white: BRAND_LOGOS.horizontalWhite },
  stacked:    { color: BRAND_LOGOS.stacked,    black: BRAND_LOGOS.stackedBlack,    white: BRAND_LOGOS.stackedWhite },
  mark:       { color: BRAND_LOGOS.mark,       black: BRAND_LOGOS.markBlack,       white: BRAND_LOGOS.markWhite }
};

export default function Logo({
  variant = "horizontal",
  tone = "color",
  size = 48,
  href = "/" as string | null,
  className = ""
}: {
  variant?: Variant;
  /** Colourway — full colour, one-colour black, or reversed white. */
  tone?: Tone;
  /** Rendered height in pixels. Width derives from the variant's aspect. */
  size?: number;
  href?: string | null;
  className?: string;
}) {
  if (variant === "mark" && tone === "color") {
    const inner = <BrandMark size={size} className={className} title={BRAND_NAME} />;
    return wrap(inner, href);
  }

  const src    = SRC[variant][tone];
  const height = size;
  const width  = Math.round(size * BRAND_ASPECTS[variant]);

  const inner = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={BRAND_NAME}
      width={width}
      height={height}
      className={className}
      style={{ display: "inline-block" }}
    />
  );
  return wrap(inner, href);
}

function wrap(inner: React.ReactNode, href: string | null) {
  if (!href) return inner;
  return (
    <Link href={href} aria-label={BRAND_HOME_LABEL} className="inline-flex shrink-0 items-center">
      {inner}
    </Link>
  );
}
