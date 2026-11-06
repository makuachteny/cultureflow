import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Field from "@/components/ui/Field";
import PageTitle from "../_parts/PageTitle";
import SavedPill from "../_parts/SavedPill";
import InfoBanner from "../_parts/InfoBanner";

async function updatePassword(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/password");

  const current = String(formData.get("current") ?? "");
  const next    = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8 || next !== confirm) {
    redirect("/account/password?err=shape");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.passwordHash) redirect("/account/password?err=oauth");

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) redirect("/account/password?err=current");

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordHash }
  });

  revalidatePath("/account/password");
  redirect("/account/password?saved=1");
}

const ERR: Record<string, string> = {
  shape:   "New password must be at least 8 characters and match the confirmation.",
  current: "Your current password didn't match.",
  oauth:   "This account signs in with a social provider — there's no password to change."
};

export default async function PasswordPage({
  searchParams
}: {
  searchParams?: { saved?: string; err?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/password");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  const saved = searchParams?.saved === "1";
  const err   = searchParams?.err ? ERR[searchParams.err] : null;

  if (!user.passwordHash) {
    return (
      <>
        <PageTitle>Password</PageTitle>
        <InfoBanner>
          This account signs in with a social provider. There&apos;s no password
          to change — manage it with your identity provider instead.
        </InfoBanner>
      </>
    );
  }

  return (
    <>
      <PageTitle>Password</PageTitle>

      {err && (
        <div role="alert" className="mb-5 max-w-2xl rounded-md border border-hibiscus/30 bg-hibiscus/5 px-4 py-3 text-[14px] text-hibiscus">
          {err}
        </div>
      )}

      <form action={updatePassword} className="max-w-2xl space-y-4">
        <Field label="Current password">
          <input name="current" type="password" className="input" required />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <input name="next" type="password" className="input" minLength={8} required />
        </Field>
        <Field label="Confirm new password">
          <input name="confirm" type="password" className="input" minLength={8} required />
        </Field>
        <div className="flex items-center justify-end gap-4 pt-2">
          {saved && <SavedPill />}
          <button type="submit" className="btn btn-primary">Change password</button>
        </div>
      </form>
    </>
  );
}
