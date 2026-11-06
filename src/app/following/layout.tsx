import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * /following is a sub-page of the public-style profile (linked from
 * the stats row on /tickets). Renders in the global site chrome — same
 * pattern as /tickets and /liked — so the user can pivot between them
 * without crossing chrome boundaries.
 */
export default async function FollowingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/following");
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20">
      {children}
    </div>
  );
}
