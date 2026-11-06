/** @type {import('next').NextConfig} */

// Server Actions need an explicit allow-list of origins. Local dev is
// always allowed; production reads APP_URL (e.g. https://tribe.example)
// so deployments don't require a code change to wire up.
const appUrl = process.env.APP_URL?.replace(/^https?:\/\//, "");
const allowedOrigins = [
  "localhost:3000",
  ...(appUrl ? [appUrl] : [])
];

const isProd = process.env.NODE_ENV === "production";

/* ─────────────────────────────────────────────────────────────
   Security headers applied to every response.

   - HSTS       : force HTTPS once production has served once
   - XFO        : block clickjacking via <iframe>
   - XCTO       : prevent MIME-sniffing
   - Referrer   : leak only the origin on cross-origin nav
   - Permissions: deny the most abused browser APIs by default
   - X-DNS-PF   : block rogue <link rel=prefetch> chains
   - CSP        : defense-in-depth against XSS / script injection

   The CSP is intentionally conservative for a Next 14 app:
   - 'self' for scripts + styles
   - 'unsafe-inline' on styles (Tailwind runtime + Next CSS-in-JS)
   - 'unsafe-inline' on scripts (required by Next's hydration marker)
   - 'unsafe-eval' on scripts ONLY in dev (Next dev server uses it for
     HMR; production CSP drops it)
   - image domains mirror next.config.images.remotePatterns + /uploads
   - connect-src includes Stripe for client-side payment flows
   - frame-src allows Stripe Checkout + OSM embed on /browse/map
   ───────────────────────────────────────────────────────────── */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // First-party imagery is served locally from /public/community/.
  // res.cloudinary.com stays for organizer-uploaded banners.
  // placehold.co stays as a no-config placeholder for early dev.
  // OSM tiles serve the /browse/map view.
  // upload.wikimedia.org allows the Commons attribution thumbnails on /credits.
  "img-src 'self' data: blob: https://res.cloudinary.com https://placehold.co https://*.tile.openstreetmap.org https://upload.wikimedia.org",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : [])
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy",   value: csp },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "X-DNS-Prefetch-Control",    value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : [])
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `standalone` produces a tiny .next/standalone tree containing only
  // the runtime files Node needs. Cuts deploy artifacts ~10x for Docker
  // / VM hosts. Vercel ignores this; harmless to leave on.
  output: "standalone",
  // Compress at the framework layer so platforms without an in-front
  // proxy (bare Node) still ship gzipped HTML/JS.
  compress: true,
  images: {
    // `formats` enables automatic AVIF + WebP transcoding when the
    // browser advertises support. Saves ~30-60% bytes on hero images.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "upload.wikimedia.org" }
    ],
    // Long-cache the optimised variants; the underlying file changes
    // when the source filename changes, so 1y is safe.
    minimumCacheTTL: 60 * 60 * 24 * 365
  },
  experimental: {
    serverActions: { allowedOrigins },
    // DEMO_DB=pglite: src/lib/demo-db.ts loads PGlite + its Prisma
    // adapter with a runtime require (invisible to the file tracer), so
    // ship them — plus the seeded snapshot — with every function.
    outputFileTracingIncludes: {
      "/**": [
        "./prisma/demo/demo-db.tar.gz",
        "./node_modules/@electric-sql/pglite/package.json",
        "./node_modules/@electric-sql/pglite/dist/*.{cjs,js,wasm,data}",
        "./node_modules/pglite-prisma-adapter/**",
        "./node_modules/@prisma/driver-adapter-utils/**",
        "./node_modules/@prisma/debug/**"
      ]
    }
  },
  async headers() {
    return [
      {
        // Security headers on every non-static route. Static assets
        // get Next's default caching headers layered on by the framework.
        source: "/:path*",
        headers: securityHeaders
      },
      {
        // Community photos are content-addressed by filename — when the
        // photo changes the filename changes (or the file is overwritten,
        // a manual operation). 30-day immutable cache balances freshness
        // and bandwidth.
        source: "/community/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" }
        ]
      }
    ];
  }
};

export default nextConfig;
