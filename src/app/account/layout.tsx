import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/organizer/DashboardShell";
import TopBar from "@/components/organizer/TopBar";
import AccountSidebar from "./AccountSidebar";

export const dynamic = "force-dynamic";

/**
 * Shell for `/account/*`. Three-column layout wrapped in the signed-in
 * DashboardShell:
 *   [ dashboard rail | account settings sub-nav | section content ]
 *
 * Auth-gates every nested page at the layout level so individual pages
 * don't need to re-run the check.
 */
export default async function AccountLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/account");
  }

  return (
    <DashboardShell role={session.user.role}>
      <TopBar />
      <main className="w-full px-8 sm:px-10 lg:px-12 py-10 sm:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <AccountSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>
    </DashboardShell>
  );
}
