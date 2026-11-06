/**
 * Admin section uses the same dashboard chrome as /dashboard so admins
 * never have to context-switch. Middleware already gates /admin to ADMIN
 * role only — this layout just trusts that.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/organizer/DashboardShell";
import TopBar from "@/components/organizer/TopBar";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <DashboardShell role={session.user.role}>
      <TopBar />
      <main className="w-full px-8 sm:px-10 lg:px-12 pt-5 sm:pt-6 pb-12 space-y-8">
        {children}
      </main>
    </DashboardShell>
  );
}
