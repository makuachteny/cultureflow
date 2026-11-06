/**
 * ThemedHero — a hero banner whose entire layout and style comes from a
 * BrowseTheme config. Six variants:
 *
 *   editorial  — two-column, serif display heading left, photo right
 *   kinetic    — bold uppercase display, angled accent bar, stat strip
 *   warm       — soft blobs + photo stack, conversational tone
 *   neon       — dark background, waveform, neon-glow display
 *   monumental — oversized city headline with photo wash + Google Fonts
 *   academic   — restrained, rule-lined, serif, categorized meta
 *
 * Renders Google Fonts via a single <link> — fonts are only loaded when a
 * themed page actually mounts, so the default /browse page pays nothing.
 */

import type { BrowseTheme } from "@/lib/browseThemes";

export default function ThemedHero({ theme }: {
  theme: BrowseTheme;
  /** Kept on the public surface for backward compat with call sites
   *  that still pass the count. The variants no longer render it —
   *  the eyebrow ribbon and the result-count chip have been removed
   *  in favour of a calmer heading + lede only. */
  resultCount?: number;
}) {
  // Parse {{accent}}…{{/accent}} spans inside the heading so we can style
  // just the accented portion without requiring JSX in the config.
  const heading = renderHeadingWithAccent(theme.copy.heading, theme.palette.accent);

  return (
    <>
      {theme.variant === "editorial"  && <Editorial  theme={theme} heading={heading} />}
      {theme.variant === "kinetic"    && <Kinetic    theme={theme} heading={heading} />}
      {theme.variant === "warm"       && <Warm       theme={theme} heading={heading} />}
      {theme.variant === "neon"       && <Neon       theme={theme} heading={heading} />}
      {theme.variant === "monumental" && <Monumental theme={theme} heading={heading} />}
      {theme.variant === "academic"   && <Academic   theme={theme} heading={heading} />}
    </>
  );
}

/* ────────── Helpers ────────── */
function renderHeadingWithAccent(h: string, accent: string): React.ReactNode {
  // Replace {{accent}}...{{/accent}} pairs with <span style={{color: accent}}>
  const parts: React.ReactNode[] = [];
  const re = /\{\{accent\}\}([\s\S]*?)\{\{\/accent\}\}/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(h)) !== null) {
    if (m.index > lastIndex) parts.push(<span key={`t${i}`}>{h.slice(lastIndex, m.index)}</span>);
    // Accent = a solid stamped block in the theme colour with
    // black/white text picked for contrast (never coloured text, which
    // vanished for yellow-on-white themes).
    parts.push(
      <span
        key={`a${i}`}
        className="px-[0.12em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        style={{ background: accent, color: inkOn(accent) }}
      >
        {m[1]}
      </span>
    );
    lastIndex = re.lastIndex;
    i += 1;
  }
  if (lastIndex < h.length) parts.push(<span key={`e`}>{h.slice(lastIndex)}</span>);
  return <>{parts}</>;
}

/** Black or white, whichever reads better on a flat hex background. */
function inkOn(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? "#000000" : "#FFFFFF";
}

function PatternLayer({ kind, accent, fg }: { kind: BrowseTheme["pattern"]; accent: string; fg: string }) {
  if (!kind) return null;
  if (kind === "dots") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${hexA(fg, 0.08)} 1.4px, transparent 1.4px)`,
          backgroundSize: "22px 22px"
        }}
      />
    );
  }
  if (kind === "lines") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${hexA(fg, 0.06)} 1px, transparent 1px)`,
          backgroundSize: "100% 40px"
        }}
      />
    );
  }
  if (kind === "stripe") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(110deg, transparent 0%, transparent 45%, ${accent} 45%, ${accent} 52%, transparent 52%)`
        }}
      />
    );
  }
  if (kind === "radial") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(${hexA(fg, 0.10)} 2px, transparent 2px) 0 0 / 22px 22px, linear-gradient(110deg, transparent 0 62%, ${accent} 62% 64%, transparent 64%)`
        }}
      />
    );
  }
  if (kind === "tartan") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.08]"
        style={{
          background:
            `repeating-linear-gradient(90deg, ${accent} 0 3px, transparent 3px 60px),
             repeating-linear-gradient(0deg, ${accent} 0 3px, transparent 3px 60px)`
        }}
      />
    );
  }
  return null;
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ════════════════ Variants ════════════════ */
type VariantProps = {
  theme: BrowseTheme;
  heading: React.ReactNode;
};

function Editorial({ theme, heading }: VariantProps) {
  return (
    <section
      className="relative overflow-hidden border-2 border-black shadow-[8px_8px_0_0_#000]"
      style={{ background: theme.palette.bg, color: theme.palette.fg }}
    >
      <PatternLayer kind={theme.pattern} accent={theme.palette.accent} fg={theme.palette.fg} />
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16 flex flex-col justify-center">
          <h1
            className="text-[32px] sm:text-[40px] lg:text-[48px] leading-[1.05] font-bold tracking-tight"
          >
            {heading}
          </h1>
          <p
            className="mt-4 text-[15px] sm:text-[16px] max-w-[480px] leading-relaxed"
            style={{ color: hexA(theme.palette.fg, 0.82) }}
          >
            {theme.copy.lede}
          </p>
        </div>
        <div
          className="relative min-h-[260px] md:min-h-[360px]"
          style={{
            backgroundImage: theme.image ? `url(${theme.image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
      </div>
    </section>
  );
}

function Kinetic({ theme, heading }: VariantProps) {
  return (
    <section
      className="relative overflow-hidden border-2 border-black shadow-[8px_8px_0_0_#000]"
      style={{ background: theme.palette.bg, color: theme.palette.fg }}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: theme.image ? `url(${theme.image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "right center",
          clipPath: "polygon(55% 0, 100% 0, 100% 100%, 45% 100%)",
          filter: "saturate(1.1)"
        }}
      />
      <PatternLayer kind={theme.pattern} accent={theme.palette.accent} fg={theme.palette.fg} />
      <div
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{
          left: "45%",
          width: "8%",
          background: `linear-gradient(110deg, transparent 0%, transparent 30%, ${theme.palette.accent} 30%, ${theme.palette.accent} 70%, transparent 70%)`
        }}
      />
      <div className="relative px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16 max-w-[55%]">
        <h1
          className="text-[34px] sm:text-[52px] lg:text-[72px] uppercase leading-[.92] tracking-tight font-bold"
          style={{ letterSpacing: "-0.02em" }}
        >
          {heading}
        </h1>
        <p
          className="mt-6 max-w-[460px] leading-relaxed"
          style={{ color: hexA(theme.palette.fg, 0.82) }}
        >
          {theme.copy.lede}
        </p>
      </div>
    </section>
  );
}

function Warm({ theme, heading }: VariantProps) {
  return (
    <section
      className="relative overflow-hidden border-2 border-black shadow-[8px_8px_0_0_#000]"
      style={{ background: theme.palette.bg, color: theme.palette.fg }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="absolute -top-20 right-10 w-[340px] h-[340px] rounded-full opacity-80"
        style={{ background: theme.palette.accent }}
      />
      <div
        aria-hidden
        className="absolute top-40 right-40 w-[180px] h-[180px] rounded-full opacity-90"
        style={{ background: theme.palette.accent2 }}
      />
      <div
        aria-hidden
        className="absolute top-80 right-80 w-[100px] h-[100px] rounded-full opacity-80"
        style={{ background: theme.palette.muted }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
        <div>
          <h1
            className="text-5xl sm:text-6xl lg:text-[92px] leading-[1] font-extrabold tracking-[-0.02em]"
            style={{ color: theme.palette.fg }}
          >
            {heading}
          </h1>
          <p
            className="mt-6 text-lg max-w-[520px] leading-relaxed"
            style={{ color: hexA(theme.palette.fg, 0.8) }}
          >
            {theme.copy.lede}
          </p>
        </div>
        {theme.image && (
          <div className="hidden lg:block relative h-[340px]">
            <div
              className="absolute w-[240px] h-[300px] border-[3px] border-black shadow-[8px_8px_0_0_#000]"
              style={{
                top: 0, left: 0, transform: "rotate(-4deg)",
                backgroundImage: `url(${theme.image})`, backgroundSize: "cover", backgroundPosition: "center"
              }}
            />
            <div
              className="absolute w-[220px] h-[270px] border-[3px] border-black shadow-[8px_8px_0_0_#000]"
              style={{
                top: 30, left: 220, transform: "rotate(3deg)",
                backgroundImage: `url(${theme.image})`, backgroundSize: "cover", backgroundPosition: "left"
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Neon({ theme, heading }: VariantProps) {
  const bars = 22;
  return (
    <section
      className="relative overflow-hidden border-2 border-black shadow-[8px_8px_0_0_#000]"
      style={{ background: theme.palette.bg, color: theme.palette.fg }}
    >
      {/* Grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            `linear-gradient(${hexA(theme.palette.accent, 0.08)} 1px, transparent 1px),
             linear-gradient(90deg, ${hexA(theme.palette.accent2, 0.08)} 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      />
      <PatternLayer kind={theme.pattern} accent={theme.palette.accent} fg={theme.palette.fg} />

      <div className="relative px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16 max-w-[860px]">
        <h1
          className="text-[38px] sm:text-[60px] lg:text-[92px] leading-[.9] uppercase"
          style={{
            letterSpacing: "2px",
            textShadow: `0 0 24px ${hexA(theme.palette.accent, 0.35)}, 0 0 48px ${hexA(theme.palette.accent, 0.18)}`
          }}
        >
          {heading}
        </h1>
        <p
          className="mt-6 max-w-[560px] leading-relaxed"
          style={{ color: theme.palette.muted }}
        >
          {theme.copy.lede}
        </p>

        {/* Waveform */}
        <div className="mt-8 flex items-end gap-[3px] h-[58px]">
          {Array.from({ length: bars }).map((_, i) => (
            <span
              key={`bar-${i}`}
              className="w-[4px]"
              style={{
                height: `${10 + ((i * 37) % 85)}%`,
                background: i % 2 ? theme.palette.accent : theme.palette.accent2,
                animation: `themed-wave 1.2s ease-in-out ${i * 0.06}s infinite`
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes themed-wave {
          0%,100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
}

function Monumental({ theme, heading }: VariantProps) {
  return (
    <section
      className="relative overflow-hidden border-2 border-black shadow-[8px_8px_0_0_#000]"
      style={{ background: theme.palette.bg, color: theme.palette.fg }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage: theme.image ? `url(${theme.image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, ${hexA(theme.palette.bg, 0.92)} 0 58%, ${theme.palette.accent} 58% 60.5%, transparent 60.5%)`
        }}
      />
      <PatternLayer kind={theme.pattern} accent={theme.palette.accent} fg={theme.palette.fg} />
      <div className="relative px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16 max-w-[860px]">
        <h1
          className="text-[34px] sm:text-[52px] lg:text-[72px] leading-[.95] uppercase tracking-[1px] font-bold"
        >
          {heading}
        </h1>
        <p
          className="mt-4 max-w-[540px] text-[15px] sm:text-[16px] leading-relaxed"
          style={{ color: hexA(theme.palette.fg, 0.88) }}
        >
          {theme.copy.lede}
        </p>
      </div>
    </section>
  );
}

function Academic({ theme, heading }: VariantProps) {
  return (
    <section
      className="relative border-2 border-black shadow-[8px_8px_0_0_#000] overflow-hidden"
      style={{ background: theme.palette.bg, color: theme.palette.fg }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16 flex flex-col justify-center">
          <h1
            className="text-[28px] sm:text-[36px] lg:text-[48px] leading-[1.02] tracking-tight"
            style={{ fontWeight: 600 }}
          >
            {heading}
          </h1>
          <p
            className="mt-4 text-[14px] sm:text-[15px] max-w-[480px] leading-relaxed"
            style={{ color: hexA(theme.palette.fg, 0.8) }}
          >
            {theme.copy.lede}
          </p>
        </div>
        <div
          className="relative min-h-[200px] md:min-h-[280px] border-l"
          style={{
            borderColor: hexA(theme.palette.fg, 0.1),
            backgroundImage: theme.image ? `url(${theme.image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div
            className="absolute bottom-6 right-6 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold"
            style={{ background: theme.palette.bg, color: theme.palette.fg }}
          >
            {theme.key} · MMXXVI
          </div>
        </div>
      </div>
      <div
        className="flex gap-0 overflow-x-auto border-t border-b"
        style={{ borderColor: hexA(theme.palette.fg, 0.1) }}
      >
        {["All", "This week", "This month", "Upcoming", "Popular"].map((f, i) => (
          <div
            key={f}
            className="px-6 py-4 text-[11px] tracking-[0.2em] uppercase font-semibold cursor-pointer transition-colors"
            style={{
              color: i === 0 ? theme.palette.bg : theme.palette.fg,
              background: i === 0 ? theme.palette.fg : "transparent",
              borderRight: `1px solid ${hexA(theme.palette.fg, 0.1)}`
            }}
          >
            {f}
          </div>
        ))}
      </div>
    </section>
  );
}
