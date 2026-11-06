import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:       "My tickets",
  description: "View, download, and transfer your tickets for upcoming events."
};

/**
 * /tickets is a standalone profile + orders surface — a public-style
 * "my profile" page. It deliberately renders inside the global site
 * chrome (Header / Footer / nav) rather than the dashboard sidebar.
 * Just an auth gate here; layout itself is plain.
 */
export default async function TicketsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/tickets");
  return <>{children}</>;
}
