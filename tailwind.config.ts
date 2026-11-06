import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brighter "Daybreak" palette — warmer, higher-contrast, more energetic.
        // Primary navy is softened; a coral/sunset accent does the heavy lifting.
        nile: {
          DEFAULT: "#2E5CB8",  // brighter, more saturated blue
          50:  "#EEF4FF",
          100: "#DBE6FA",
          200: "#B9CDF2",
          300: "#8BAEE8",
          400: "#5A88DA",
          500: "#2E5CB8",
          600: "#2449A0",
          700: "#1B3A85",
          800: "#142C66",
          900: "#0E1F4A"
        },
        gold: {
          DEFAULT: "#F5B800",  // vivid, brighter gold
          50:  "#FFF9E5",
          100: "#FFF0B8",
          400: "#FFCE3A",
          500: "#F5B800",
          600: "#D9930F",      // savanna amber — the brand mark colour
          // gold-700 — accessible amber for eyebrows / kicker text on
          // light surfaces. #8B6500 measures 5.4:1 on white (passes AA),
          // while keeping the warm brand temperature. Use this anywhere
          // gold text sits on bg-white / bg-cream / bg-parchment.
          700: "#8B6500",
          800: "#604700"
        },
        // `mark` is a single-shade alias for the brand mark colour
        // (savanna amber). Use `bg-mark` / `text-mark` / `ring-mark` when
        // you want to reach for "the colour the horns logo uses" without
        // having to remember it lives at gold-600.
        mark: {
          DEFAULT: "#D9930F"
        },
        // `sunset` used to be a coral-orange accent; it was removed from
        // the palette per brand direction. Classes across the codebase
        // (bg-sunset-50, text-sunset-600, ring-sunset/30, etc.) still
        // resolve — they now render as Nile blue shades, so there's no
        // visual "orange" left anywhere without having to touch 70+
        // component files.
        sunset: {
          DEFAULT: "#2E5CB8",  // nile-500
          50:  "#EEF4FF",      // nile-50
          100: "#DBE6FA",      // nile-100
          400: "#5A88DA",      // nile-400
          500: "#2E5CB8",      // nile-500
          600: "#2449A0"       // nile-600
        },
        acacia: {
          DEFAULT: "#1FA974",  // punchier green
          50:  "#E4F8EF",
          500: "#1FA974",
          600: "#168C5E",
          /* AA-clean on light surfaces (≥ 6:1 on white) — used for
             small text accents ("Saved ✓", status pills) that sit on
             tinted backgrounds. */
          700: "#0F7048"
        },
        hibiscus: { DEFAULT: "#E44C4C" },
        clay: { DEFAULT: "#E08A3C" },
        // App background — pulled way back toward pure white; only a
        // whisper of warmth remains so it doesn't look clinical.
        parchment: { DEFAULT: "#FCFCFA" },
        cream: {
          DEFAULT: "#FAFAF7",
          50:  "#FDFDFC",
          100: "#FAFAF7",
          200: "#F3F3EF"
        },
        // Ink scale — purple-inflected family that pairs with the
        // Nile + savanna-amber brand. Six rungs (300–900) span hairline
        // decoration to AAA display copy on a #FCFCFA / cream background.
        // Contrast ratios vs. #FCFCFA (approx):
        //   DEFAULT #1E0A3C → 15.8:1  (AAA)
        //   ink-800 #2A1F54 → 12.4:1  (AAA)
        //   ink-700 #39364F →  9.6:1  (AAA) — body text
        //   ink-600 #585163 →  6.5:1  (AAA) — muted body
        //   ink-500 #6F7287 →  4.9:1  (AA normal, AAA large)
        //   ink-400 #A9A8B3 →  2.8:1  (decoration / placeholder only)
        //   ink-300 #C7C6CE →  1.9:1  (hairline decoration)
        ink: {
          DEFAULT: "#1E0A3C",
          900: "#1E0A3C",
          800: "#2A1F54",
          700: "#39364F",
          600: "#585163",
          500: "#6F7287",
          400: "#A9A8B3",
          300: "#C7C6CE",
          // Back-compat aliases used elsewhere (value-identical to 700/500).
          70:  "#39364F",
          60:  "#585163"
        }
      },
      fontFamily: {
        // Inter is the entire type system. All three keys point at the
        // same CSS variable (`--font-sans`), which is bound to the
        // `next/font/google` Inter loader in `app/layout.tsx`. The system
        // fallback chain matches `--font-sans` in globals.css. Hierarchy
        // comes from weight + size, never family — keep it that way.
        sans:    ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono:    ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,44,102,0.05), 0 8px 24px rgba(20,44,102,0.08)",
        // `pop` was tinted coral when the brand had an orange accent —
        // now nile-tinted to match the rest of the elevation ladder.
        pop:  "0 4px 12px rgba(46,92,184,0.22)"
      },
      maxWidth: {
        // Page container — 88 rem (1408 px). With `gap-6` between four
        // cards in a row, each card lands at ≈334 px on a 1920-px wide
        // viewport, which is the visual rhythm we tuned the EventCard
        // typography against.
        "7xl": "88rem"
      },
      backgroundImage: {
        // Brand sunrise — gold → nile, no coral midpoint. (Was a 3-stop
        // gold→coral→nile when the brand still had an orange accent.)
        "hero-sunrise":
          "linear-gradient(135deg, #F5B800 0%, #FFCE3A 30%, #5A88DA 70%, #2E5CB8 100%)",
        "nile-gradient":
          "linear-gradient(135deg, #2E5CB8 0%, #142C66 100%)"
      }
    }
  },
  plugins: []
};

export default config;
