import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PageTitle from "../_parts/PageTitle";

async function closeAccount(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "CLOSE") redirect("/account/close-account?err=confirm");

  // Soft-delete via status rather than destroying rows — preserves ticket
  // history, organizer payouts, and moderation logs. A scheduled job can
  // hard-purge after the statutory retention window.
  await prisma.user.update({
    where: { id: session.user.id },
    data:  { status: "SUSPENDED" }
  });

  await signOut({ redirectTo: "/" });
}

export default async function CloseAccountPage({
  searchParams
}: {
  searchParams?: { err?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/close-account");

  const err = searchParams?.err === "confirm"
    ? "You need to type CLOSE exactly to confirm."
    : null;

  return (
    <>
      <PageTitle>Close Account</PageTitle>

      <div className="max-w-2xl">
        <div className="rounded-md border border-hibiscus/30 bg-hibiscus/5 p-5">
          <h2 className="text-[15px] font-bold text-hibiscus">This is permanent</h2>
          <p className="mt-2 text-[13px] text-ink-800">
            Closing your account disables sign-in and hides your profile. Tickets
            you already hold remain valid — but you won&apos;t be able to manage
            them from here. This action cannot be undone from the app.
          </p>
        </div>

        {err && (
          <div role="alert" className="mt-5 rounded-md border border-hibiscus/30 bg-hibiscus/5 px-4 py-3 text-[14px] text-hibiscus">
            {err}
          </div>
        )}

        <form action={closeAccount} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Type <span className="font-mono">CLOSE</span> to confirm
            </span>
            <input name="confirm" className="input" autoComplete="off" required />
          </label>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-danger">Close my account</button>
          </div>
        </form>
      </div>
    </>
  );
}
