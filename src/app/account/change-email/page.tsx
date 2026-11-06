import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Field from "@/components/ui/Field";
import PageTitle from "../_parts/PageTitle";
import SavedPill from "../_parts/SavedPill";

async function updateEmail(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/change-email");

  const newEmail     = String(formData.get("newEmail") ?? "").trim().toLowerCase();
  const confirmEmail = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  const password     = String(formData.get("password") ?? "");

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
  if (!emailOk || newEmail !== confirmEmail) {
    redirect("/account/change-email?err=mismatch");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  // If the account has a password (credentials user), verify it before
  // letting them move the login identifier. OAuth-only accounts skip this.
  if (user.passwordHash) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) redirect("/account/change-email?err=password");
  }

  // Refuse silently if the new email is already taken — Prisma would throw
  // on the unique constraint otherwise, which renders a generic 500.
  const clash = await prisma.user.findUnique({ where: { email: newEmail } });
  if (clash && clash.id !== user.id) {
    redirect("/account/change-email?err=taken");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email: newEmail, emailVerified: null }
  });

  revalidatePath("/account/change-email");
  redirect("/account/change-email?saved=1");
}

const ERR: Record<string, string> = {
  mismatch: "The two emails don't match, or the format is invalid.",
  password: "That password didn't match your current account password.",
  taken:    "That email is already used by another account."
};

export default async function ChangeEmailPage({
  searchParams
}: {
  searchParams?: { saved?: string; err?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/change-email");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  const saved = searchParams?.saved === "1";
  const err   = searchParams?.err ? ERR[searchParams.err] : null;

  return (
    <>
      <PageTitle>Change Email</PageTitle>

      <div className="max-w-2xl">
        <p className="mb-5 text-[14px] text-ink-700">
          Your current login email is{" "}
          <span className="font-semibold text-ink-900">{user.email}</span>.
        </p>

        {err && (
          <div role="alert" className="mb-5 rounded-md border border-hibiscus/30 bg-hibiscus/5 px-4 py-3 text-[14px] text-hibiscus">
            {err}
          </div>
        )}

        <form action={updateEmail} className="space-y-4">
          <Field label="New email">
            <input name="newEmail" type="email" className="input" required />
          </Field>
          <Field label="Confirm new email">
            <input name="confirmEmail" type="email" className="input" required />
          </Field>
          {user.passwordHash && (
            <Field label="Current password">
              <input name="password" type="password" className="input" required />
            </Field>
          )}
          <div className="flex items-center justify-end gap-4 pt-2">
            {saved && <SavedPill />}
            <button type="submit" className="btn btn-primary">Change email</button>
          </div>
        </form>
      </div>
    </>
  );
}
