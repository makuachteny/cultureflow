import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * /liked is a sub-page of the public-style profile (linked from the
 * stats row on /tickets). It deliberately renders inside the global
 * site chrome — Header / Footer / nav — rather than the dashboard
 * sidebar so the navigation between /tickets, /liked, and /following
 * stays consistent. Just an auth gate here.
 */
export default async function LikedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/liked");
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20">
      {children}
    </div>
  );
}
