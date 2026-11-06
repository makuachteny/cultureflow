import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FEATURED_CITIES } from "@/lib/taxonomy";
import WelcomeWizard from "./WelcomeWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:       "Welcome",
  description: "Tell us where you're from and what you love so we can show you the right events."
};

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/welcome");

  // Load the current user — cast the `select` so `tribe` is accepted now
  // and resolved for real after the next `prisma generate`.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: ({
      id: true, name: true, email: true, city: true, tribe: true
    } as unknown) as { id: true; name: true; email: true; city: true }
  });
  if (!user) redirect("/sign-in");

  const uExt = user as typeof user & {
    tribe?: string | null;
    interests?: string[];
    onboardedAt?: Date | null;
  };

  // Already onboarded? Skip the wizard.
  if (uExt.onboardedAt) redirect("/");

  // Top organizers to suggest for the "Follow" step. Pick organizers who
  // have the most published, upcoming events — same city bumps them up.
  const organizers = await prisma.user.findMany({
    where: {
      role: { in: ["ORGANIZER", "ADMIN"] },
      events: { some: { status: "PUBLISHED", endsAt: { gte: new Date() } } },
      NOT: { id: user.id }
    },
    select: {
      id: true, name: true, image: true, city: true, country: true,
      _count: { select: { events: true, followers: true } }
    },
    orderBy: { followers: { _count: "desc" } },
    take: 12
  });

  return (
    <WelcomeWizard
      user={{
        name:  user.name ?? "",
        email: user.email,
        city:  user.city ?? "",
        tribe: uExt.tribe ?? "",
        interests: uExt.interests ?? []
      }}
      citySuggestions={FEATURED_CITIES.map((c) => c.label)}
      organizers={organizers.map((o) => ({
        id: o.id,
        name: o.name ?? "Organizer",
        image: o.image,
        city: o.city,
        country: o.country,
        eventCount: o._count.events,
        followerCount: o._count.followers
      }))}
    />
  );
}
