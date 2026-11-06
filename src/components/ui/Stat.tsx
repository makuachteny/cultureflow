/**
 * Stat card — modern KPI tile.
 *
 * Pattern: small uppercase eyebrow, large tabular number, optional
 * supporting line beneath, optional trend chip on the right of the
 * eyebrow row.
 *
 *   <Stat label="Paid orders" value={count.toLocaleString()} />
 *   <Stat label="Revenue"     value={formatPrice(cents)} size="lg" />
 *   <Stat label="Net"         value={formatPrice(net)}  tone="acacia"
 *         caption="this week" />
 */

type Size = "sm" | "md" | "lg";
type Tone = "default" | "muted" | "acacia" | "gold" | "hibiscus";

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-[24px] sm:text-[26px]",
  md: "text-[30px] sm:text-[34px]",
  lg: "text-[40px] sm:text-[48px]"
};

const TONE_CLASS: Record<Tone, string> = {
  default:  "text-nile-900",
  muted:    "text-ink-500",
  acacia:   "text-acacia-600",
  gold:     "text-gold-700",
  hibiscus: "text-hibiscus"
};

export default function Stat({
  label,
  value,
  size = "md",
  tone = "default",
  caption
}: {
  label:    string;
  value:    string | number;
  size?:    Size;
  tone?:    Tone;
  /** Quiet supporting line shown beneath the value. */
  caption?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[color:var(--border-hairline)] hover:shadow-card transition-shadow">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </div>
      <div className={`mt-3 font-display font-extrabold font-tabular tracking-tight leading-none ${SIZE_CLASS[size]} ${TONE_CLASS[tone]}`}>
        {value}
      </div>
      {caption && (
        <div className="mt-2 text-[12.5px] text-ink-600 leading-snug">
          {caption}
        </div>
      )}
    </div>
  );
}
