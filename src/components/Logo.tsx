import Link from "next/link";
import { BRAND_HOME_LABEL, BRAND_LOGOS, BRAND_NAME } from "@/lib/brand";
import BrandMark from "./brand/BrandMark";

/**
 * Logo — the canonical brand lockup. Renders one of the pre-built
 * SVG variants from /public so layout, kerning, and colour stay
 * pixel-faithful to the master `/logo.svg`.
 *
 *   <Logo />                       horizontal lockup (mark + wordmark)
 *   <Logo variant="stacked" />     mark above wordmark
 *   <Logo variant="mark" />        just the mark
 */

type Variant = "horizontal" | "stacked" | "mark";

const ASPECTS: Record<Variant, number> = {
  // width / height ratios from /scripts/build-brand-svgs.mjs viewBoxes.
  // Keep these in sync with HORIZ_W/HORIZ_H, STACKED_W/STACKED_H,
  // MARK_BOX in the build script — drift here causes the rendered
  // width to mismatch the SVG aspect and crop or letterbox the image.
  horizontal: 1130 / 200,
  stacked:    720 / 480,
  mark:       410 / 280
};

export default function Logo({
  variant = "horizontal",
  size = 48,
  href = "/" as string | null,
  className = ""
}: {
  variant?: Variant;
  /** Rendered height in pixels. Width derives from the variant's aspect. */
  size?: number;
  href?: string | null;
  className?: string;
}) {
  if (variant === "mark") {
    const inner = <BrandMark size={size} className={className} title={BRAND_NAME} />;
    return wrap(inner, href);
  }

  const src    = variant === "stacked" ? BRAND_LOGOS.stacked : BRAND_LOGOS.horizontal;
  const height = size;
  const width  = Math.round(size * ASPECTS[variant]);

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
