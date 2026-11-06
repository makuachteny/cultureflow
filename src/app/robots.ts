import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* Everything behind auth stays out of search. The `/events/new`
         * marketing landing is intentionally indexable; `/sign-in` and
         * `/sign-up` are too thin to reward indexing and bounce back if
         * a user is signed in, so they go here too. */
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/tickets",
          "/account",
          "/liked",
          "/following",
          "/interests",
          "/welcome",
          "/sign-in",
          "/sign-up"
        ]
      }
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
