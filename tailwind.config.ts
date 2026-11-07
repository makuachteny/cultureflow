import type { Config } from "tailwindcss";

/*
 * CultureFlow design system — "Colour blocks & beadwork".
 *
 * Six flat, saturated colours — black, red, green, blue, gold, white —
 * the primaries that show up in festival dress, beadwork, textiles and
 * hand-painted signs in communities everywhere. No gradients, no blur,
 * no rounded corners:
 *   • borderRadius is overridden (not extended) to 0 at every step, so
 *     every `rounded-*` class across the app renders square.
 *   • boxShadow steps are hard offset "print" shadows with zero blur.
 *
 * Token NAMES are kept from the previous palette (nile, gold, acacia,
 * hibiscus, ink, cream…) so ~150 components re-skin without edits:
 *   nile     → flag blue      gold    → star yellow
 *   acacia   → flag green     hibiscus/clay → flag red
 *   ink      → true black + neutral greys
 */
const BLACK = "#000000";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    borderRadius: {
      none: "0",
      sm: "0",
      DEFAULT: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "0"
    },
    extend: {
      colors: {
        // Blue.
        nile: {
          DEFAULT: "#0F47AF",
          50: "#E7EEFC",
          100: "#C9D8F7",
          200: "#9DB8EF",
          300: "#6A93E4",
          400: "#3A6ED6",
          500: "#0F47AF",
          600: "#0C3A90",
          700: "#0A2F75",
          800: "#07235A",
          900: "#04173D"
        },
        // Gold. 700/800 are dark ochres for text on light surfaces
        // (#6E5A00 ≈ 7:1 on white) — never put yellow text on white.
        gold: {
          DEFAULT: "#FCDD09",
          50: "#FFFBE0",
          100: "#FFF4AD",
          400: "#FDE54A",
          500: "#FCDD09",
          600: "#E5C700",
          700: "#6E5A00",
          800: "#4D3F00"
        },
        mark: { DEFAULT: "#FCDD09" },
        // Legacy alias — renders as flag blue.
        sunset: {
          DEFAULT: "#0F47AF",
          50: "#E7EEFC",
          100: "#C9D8F7",
          400: "#3A6ED6",
          500: "#0F47AF",
          600: "#0C3A90"
        },
        // Green.
        acacia: {
          DEFAULT: "#078930",
          50: "#E3F5E9",
          500: "#078930",
          600: "#066E27",
          700: "#05571F"
        },
        // Red.
        hibiscus: {
          DEFAULT: "#DA121A",
          50: "#FDE7E8",
          100: "#FAC5C7",
          500: "#DA121A",
          600: "#B30E15",
          700: "#8C0B10"
        },
        clay: { DEFAULT: "#DA121A" },
        parchment: { DEFAULT: "#FFFFFF" },
        // Pale gold paper for alternating sections.
        cream: {
          DEFAULT: "#FFF6D1",
          50: "#FFFCEE",
          100: "#FFF6D1",
          200: "#FFEDA3"
        },
        ink: {
          DEFAULT: BLACK,
          900: BLACK,
          800: "#161616",
          700: "#262626",
          600: "#404040",
          500: "#5C5C5C",
          400: "#8F8F8F",
          300: "#C4C4C4",
          70: "#262626",
          60: "#404040"
        }
      },
      fontFamily: {
        // Archivo (variable width) for everything — see app/layout.tsx.
        // Headlines widen via `font-stretch` in globals.css.
        sans: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"],
        display: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"],
        mono: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"]
      },
      boxShadow: {
        // Hard offset shadows — zero blur, solid black.
        sm: `2px 2px 0 0 ${BLACK}`,
        DEFAULT: `3px 3px 0 0 ${BLACK}`,
        md: `4px 4px 0 0 ${BLACK}`,
        lg: `6px 6px 0 0 ${BLACK}`,
        xl: `8px 8px 0 0 ${BLACK}`,
        "2xl": `10px 10px 0 0 ${BLACK}`,
        card: `6px 6px 0 0 ${BLACK}`,
        pop: `4px 4px 0 0 ${BLACK}`,
        // Coloured offsets for category-keyed cards.
        "hard-red": `6px 6px 0 0 #DA121A`,
        "hard-green": `6px 6px 0 0 #078930`,
        "hard-blue": `6px 6px 0 0 #0F47AF`,
        "hard-yellow": `6px 6px 0 0 #FCDD09`
      },
      maxWidth: {
        "7xl": "88rem"
      },
      backgroundImage: {
        // Uneven vertical colour blocks — hard stops only, so it reads
        // as painted panels, never a blend.
        "hero-sunrise":
          "linear-gradient(90deg, #DA121A 0 13%, #FCDD09 13% 24%, #0F47AF 24% 41%, #078930 41% 50%, #000 50% 63%, #DA121A 63% 72%, #FCDD09 72% 86%, #0F47AF 86% 100%)",
        "nile-gradient": "linear-gradient(#0F47AF, #0F47AF)"
      }
    }
  },
  plugins: []
};

export default config;
