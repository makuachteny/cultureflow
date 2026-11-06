import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChromeGate from "@/components/ChromeGate";
import CookieConsent from "@/components/CookieConsent";
import { BRAND_NAME, BRAND_SHORT_TAG, BRAND_DESCRIPTION } from "@/lib/brand";
import { safeJsonLd } from "@/lib/jsonld";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/**
 * Inter — the entire type system. Single-font discipline (like Linear,
 * Vercel, Replit, Cash App) keeps the platform feeling clean and organized.
 * We load the full weight range so `font-bold`, `font-semibold`, and
 * display headings all render to real, designed weights — no browser-
 * synthesized fake-bold. Bound to both `--font-sans` and `--font-display`
 * so existing `font-display`-classed headings keep working; the contrast
 * between body and headings comes from weight + size, not family.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${BRAND_NAME} — ${BRAND_SHORT_TAG}`, template: `%s · ${BRAND_NAME}` },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME }],
  generator: "Next.js",
  keywords: [
    "South Sudan", "South Sudanese", "diaspora", "events", "tickets",
    "Dinka", "Nuer", "Bari", "Juba", "community",
    "weddings", "church", "fundraiser", "conference", "cultural"
  ],
  openGraph: {
    title: BRAND_NAME,
    description: `${BRAND_SHORT_TAG}.`,
    url: APP_URL,
    siteName: BRAND_NAME,
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: `${BRAND_SHORT_TAG}.`
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  alternates: {
    canonical: APP_URL
  },
  icons: {
    /* Favicon strategy:
     *  – Primary: /logo-app-icon.svg — gold horns on a Nile-blue rounded
     *    square. The blue background gives the icon presence in light or
     *    dark browser chrome (the standalone mark on transparent washes
     *    out in tab bars).
     *  – `sizes: "any"` tells the browser to use the SVG at every tile
     *    size instead of looking for sized PNG fallbacks.   */
    icon:     [{ url: "/logo-app-icon.svg", type: "image/svg+xml", sizes: "any" }],
    apple:    [{ url: "/logo-app-icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/logo-app-icon.svg", type: "image/svg+xml" }]
  }
};

/* Site-wide structured data: Organization + WebSite with a
   SearchAction so Google renders a sitelinks searchbox for the brand.
   One <script> block covers every page via the root layout — no need
   to repeat on child routes. */
const SITE_JSONLD = [
  {
    "@context":    "https://schema.org",
    "@type":       "Organization",
    name:          BRAND_NAME,
    url:           APP_URL,
    logo:          `${APP_URL}/logo-mark.svg`,
    description:   BRAND_DESCRIPTION
  },
  {
    "@context":    "https://schema.org",
    "@type":       "WebSite",
    name:          BRAND_NAME,
    url:           APP_URL,
    potentialAction: {
      "@type":       "SearchAction",
      target:        `${APP_URL}/browse?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Header/Footer render inside ChromeGate — a client-side pathname check
  // hides them on /welcome, /sign-in, /sign-up, /dashboard. This
  // replaces the old `headers().get("x-pathname")` approach which was
  // unreliable across soft-nav transitions.
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-parchment font-sans">
        {/* Site-wide Organization + WebSite JSON-LD — improves brand
            knowledge-graph presence and enables the sitelinks searchbox
            on Google results. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(SITE_JSONLD) }}
        />
        {/* Skip link — first focusable element. Hidden off-screen until
            a keyboard user tabs to it, at which point it slides into the
            top-left corner with a visible nile pill. */}
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[100] focus-visible:inline-flex focus-visible:items-center focus-visible:rounded-lg focus-visible:bg-nile focus-visible:px-4 focus-visible:py-2 focus-visible:text-[14px] focus-visible:font-semibold focus-visible:text-white focus-visible:shadow-lg"
        >
          Skip to main content
        </a>

        <ChromeGate><Header /></ChromeGate>
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <ChromeGate><Footer /></ChromeGate>
        <ChromeGate><CookieConsent /></ChromeGate>
      </body>
    </html>
  );
}
