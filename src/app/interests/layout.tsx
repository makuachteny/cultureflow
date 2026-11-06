import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/organizer/DashboardShell";
import TopBar from "@/components/organizer/TopBar";

export const dynamic = "force-dynamic";

export default async function InterestsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/interests");
  return (
    <DashboardShell role={session.user.role}>
      <TopBar />
      <main className="mx-auto w-full max-w-[1600px] px-6 sm:px-8 lg:px-10 py-8 sm:py-10">{children}</main>
    </DashboardShell>
  );
}
