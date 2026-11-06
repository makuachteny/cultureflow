import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { CATEGORIES, FEATURED_CITIES } from "@/lib/taxonomy";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const now = new Date();

  const [events, organizers] = await Promise.all([
    prisma.event.findMany({
      // status:PUBLISHED would be enough once the expire-events cron
      // runs, but we belt-and-brace with endsAt in case the cron lags.
      where: { status: "PUBLISHED", endsAt: { gte: now } },
      select: { slug: true, updatedAt: true }
    }),
    prisma.user.findMany({
      where: { role: { in: ["ORGANIZER", "ADMIN"] }, status: "ACTIVE" },
      select: { id: true, updatedAt: true }
    })
  ]);

  const staticPaths = [
    "", "/browse", "/pricing", "/for-organizers", "/for-attendees",
    "/how-it-works", "/about", "/help", "/contact",
    "/legal/terms", "/legal/privacy", "/legal/refunds"
  ];

  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, lastModified: now, priority: p === "" ? 1.0 : 0.6 })),
    ...FEATURED_CITIES.map((c) => ({
      url: `${base}/events/city/${c.slug}`, lastModified: now, priority: 0.7
    })),
    ...CATEGORIES.map((c) => ({
      url: `${base}/events/category/${c.slug}`, lastModified: now, priority: 0.7
    })),
    ...events.map((e) => ({
      url: `${base}/events/${e.slug}`, lastModified: e.updatedAt, priority: 0.8
    })),
    ...organizers.map((u) => ({
      url: `${base}/organizer/${u.id}`, lastModified: u.updatedAt, priority: 0.5
    }))
  ];
}
