import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/organizer/DashboardShell";
import TopBar from "@/components/organizer/TopBar";

export const metadata = {
  title: "Dashboard"
};

/**
 * Dashboard chrome = shell (sidebar) + TopBar + padded main column.
 * The sidebar is role-aware — attendees don't see the Organize group.
 *
 * Middleware handles the unauth'd redirect. ATTENDEEs are bounced
 * everywhere under /dashboard EXCEPT the event-creation entry points
 * (/dashboard/events/new, /dashboard/events/templates) — submitting
 * the form there auto-promotes them to ORGANIZER, so we have to let
 * them reach the page to be promoted. Other /dashboard routes still
 * bounce attendees to /browse to keep the experience role-coherent.
 */
export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "ATTENDEE") {
    const path = headers().get("x-pathname") ?? "";
    const isEventCreate =
      path === "/dashboard/events/new" ||
      path === "/dashboard/events/templates" ||
      path.startsWith("/dashboard/events/templates/");
    if (!isEventCreate) redirect("/browse");
  }

  return (
    <DashboardShell role={role}>
      <TopBar />
      {/* Tight top padding so the hero card lifts up near the topbar's
          bottom edge — visually aligns with the sidebar's first nav
          row across the rule. Horizontal gutters tighten on mobile so
          the page can breathe alongside the icon-only sidebar rail. */}
      <main className="w-full px-3 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-10 sm:pb-12 space-y-6 sm:space-y-8">
        {children}
      </main>
    </DashboardShell>
  );
}
