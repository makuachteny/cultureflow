import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PageTitle from "../_parts/PageTitle";

const PROVIDER_LABEL: Record<string, string> = {
  google:   "Google",
  facebook: "Facebook",
  apple:    "Apple",
  github:   "GitHub"
};

export default async function LinkedAccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/linked-accounts");

  const accounts = await prisma.account.findMany({
    where:  { userId: session.user.id },
    select: { provider: true, providerAccountId: true }
  });

  return (
    <>
      <PageTitle>Linked Accounts</PageTitle>
      <p className="mb-5 max-w-2xl text-[14px] text-ink-700">
        Social accounts you&apos;ve used to sign in. Linked providers let you
        sign in faster next time.
      </p>

      {accounts.length === 0 ? (
        <div className="max-w-2xl rounded-md border border-[color:var(--border-hairline)] bg-white px-4 py-6 text-center text-[14px] text-ink-600">
          No social accounts are linked to this profile yet.
        </div>
      ) : (
        <ul className="max-w-2xl divide-y divide-[color:var(--border-hairline)] rounded-md border border-[color:var(--border-hairline)] bg-white">
          {accounts.map((a) => (
            <li key={a.provider + a.providerAccountId} className="flex items-center justify-between px-4 py-4">
              <div>
                <div className="text-[14px] font-semibold text-ink-900">
                  {PROVIDER_LABEL[a.provider] ?? a.provider}
                </div>
                <div className="text-[12px] text-ink-500">Connected</div>
              </div>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-acacia-600">
                Active
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
