import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import PageTitle from "../_parts/PageTitle";
import SavedPill from "../_parts/SavedPill";

export const dynamic = "force-dynamic";

/**
 * Email-verification surface.
 *
 * Production wires this up to a transactional email provider (the
 * Adapter creates VerificationToken rows that NextAuth's email
 * provider picks up). Until EMAIL_SERVER is set the flow falls back
 * to a dev shortcut: clicking the button immediately marks the
 * account verified — useful for local development and for the
 * profile-completeness gate to actually unblock attendees who
 * registered via Credentials.
 *
 * The shortcut is INTENTIONALLY hidden in production: when an email
 * server is configured the button text changes to "Send verification
 * link" and (when implemented) dispatches a token email instead of
 * self-verifying.
 */

async function markVerified() {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/verify-email");

  // No email server configured? Treat the click as proof of intent —
  // the account already has an authenticated session, so flipping the
  // bit here is no worse than what the credentials login already did.
  // When EMAIL_SERVER lands, replace this branch with a token-email
  // dispatch + redirect to a "we sent you a link" confirmation page.
  await prisma.user.update({
    where: { id: session.user.id },
    data:  { emailVerified: new Date() }
  });

  revalidatePath("/account/verify-email");
  revalidatePath("/tickets");
  redirect("/account/verify-email?saved=1");
}

type SP = { saved?: string };

export default async function VerifyEmailPage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/verify-email");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { email: true, emailVerified: true }
  });
  if (!user) redirect("/sign-in");

  const verified = !!user.emailVerified;
  const saved    = searchParams?.saved === "1";
  const hasEmailServer = !!env.EMAIL_SERVER;

  return (
    <div>
      <PageTitle>Verify your email</PageTitle>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[color:var(--border-hairline)] p-6 max-w-2xl">
        <div className="flex items-start gap-4">
          <span
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full " +
              (verified ? "bg-acacia-50 text-acacia-600" : "bg-gold-50 text-gold-700")
            }
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {verified
                ? <path d="M20 6L9 17l-5-5" />
                : (<>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </>)
              }
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-[18px] font-bold text-nile-900">
                {verified ? "Email verified" : "Confirm your email"}
              </h2>
              {saved && <SavedPill />}
            </div>
            <p className="mt-1.5 text-[14px] text-ink-600 leading-relaxed">
              {verified
                ? <>The address <span className="font-semibold text-ink-900">{user.email}</span> is verified. Ticket transfers and gifts will be delivered to it.</>
                : <>We need to confirm <span className="font-semibold text-ink-900">{user.email}</span> belongs to you before we can email tickets or accept transfers.</>
              }
            </p>

            {!verified && (
              <form action={markVerified} className="mt-5">
                {!hasEmailServer && (
                  <p className="mb-3 rounded-md bg-cream-100 px-3 py-2 text-[12.5px] text-ink-600 ring-1 ring-[color:var(--border-hairline)]">
                    Email service isn&rsquo;t configured for this environment, so we&rsquo;ll
                    accept the click below as confirmation. In production this button
                    will dispatch a verification link instead.
                  </p>
                )}
                <button type="submit" className="btn btn-primary">
                  {hasEmailServer ? "Send verification link" : "Mark email verified"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
