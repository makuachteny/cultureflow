import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Following"
};

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/following");

  const follows = await prisma.follow.findMany({
    where:   { followerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      following: {
        select: {
          id: true, name: true, image: true, bio: true,
          city: true, country: true,
          _count: { select: { events: true, followers: true } }
        }
      }
    }
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-[28px] font-bold text-nile-900">Following</h1>
        <p className="mt-1 text-[14px] text-ink-600">
          Organizers you follow — their new events land at the top of your home feed.
        </p>
      </header>

      {follows.length === 0 ? (
        <EmptyState
          illustration="spark"
          title="You're not following anyone yet"
          body="Find an organizer whose events you love and tap Follow on their profile. Their new events will surface on your home feed."
          primary={{ label: "Browse events", href: "/browse" }}
        />
      ) : (
        <ul className="divide-y divide-[color:var(--border-hairline)] rounded-md border border-[color:var(--border-hairline)] bg-white">
          {follows.map(({ following: o }) => {
            const initial = (o.name?.[0] ?? "O").toUpperCase();
            const place   = [o.city, o.country].filter(Boolean).join(", ");
            return (
              <li key={o.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Link href={`/organizer/${o.id}`} className="shrink-0" aria-label={o.name ?? "Organizer"}>
                  {o.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.image}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover border border-[color:var(--border-hairline)]"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-nile text-white grid place-items-center text-[15px] font-bold">
                      {initial}
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/organizer/${o.id}`}
                    className="block text-[15px] font-semibold text-ink-900 hover:text-nile truncate"
                  >
                    {o.name ?? "Unnamed organizer"}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-ink-500 truncate">
                    {o._count.events.toLocaleString()} event{o._count.events === 1 ? "" : "s"}
                    {" · "}
                    {o._count.followers.toLocaleString()} follower{o._count.followers === 1 ? "" : "s"}
                    {place && ` · ${place}`}
                  </div>
                  {o.bio && (
                    <p className="mt-1 text-[13px] text-ink-700 line-clamp-1">{o.bio}</p>
                  )}
                </div>

                <FollowButton organizerId={o.id} initialFollowing={true} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
