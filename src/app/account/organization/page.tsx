/**
 * Account → Organization settings.
 *
 * The org-side workspace ("Dashboard → Organization settings") owns the
 * heavy stuff (team, fees, plan, extensions). This account-side page is
 * the *personal* slice: the public-organizer profile fields the user
 * shows under their name when they host an event — display name, bio,
 * tribe, location.
 *
 * It also surfaces the organizer-mode flag and a one-tap path to
 * /dashboard/settings for the deeper org-wide settings.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Field from "@/components/ui/Field";
import PageTitle from "../_parts/PageTitle";
import SavedPill from "../_parts/SavedPill";
import { TRIBE_SUGGESTIONS } from "@/lib/taxonomy";

async function updateOrganization(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/organization");

  const name    = String(formData.get("name")    ?? "").trim().slice(0, 80);
  const bio     = String(formData.get("bio")     ?? "").trim().slice(0, 1000);
  const city    = String(formData.get("city")    ?? "").trim().slice(0, 80);
  const country = String(formData.get("country") ?? "").trim().slice(0, 80);
  const tribe   = String(formData.get("tribe")   ?? "").trim().slice(0, 40);
  const website = String(formData.get("website") ?? "").trim().slice(0, 200);

  // Light URL sanity check — accept bare domain or full https URL,
  // collapse anything else to null so the org page link doesn't break.
  let websiteOrNull: string | null = null;
  if (website) {
    const stripped = website.replace(/^https?:\/\//i, "");
    if (/^[\w.-]+\.[a-z]{2,}(\/[\w.~%/?#&=+-]*)?$/i.test(stripped)) {
      websiteOrNull = "https://" + stripped;
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      bio:     bio     || null,
      city:    city    || null,
      country: country || null,
      tribe:   tribe   || null,
      website: websiteOrNull
    }
  });

  revalidatePath("/account/organization");
  redirect("/account/organization?saved=1");
}

export default async function OrganizationPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/organization");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  const saved = searchParams?.saved === "1";
  const isOrganizer = user.role === "ORGANIZER" || user.role === "ADMIN";

  return (
    <>
      <PageTitle>Organization</PageTitle>
      {saved && <SavedPill />}

      {/* Status strip — explains the role + offers the path to upgrade
          if the user is still an attendee. */}
      <section className="mb-8 rounded-md bg-cream-100/70 ring-1 ring-[color:var(--border-hairline)] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
            Role
          </div>
          <div className="mt-1 text-[15px] font-semibold text-ink-900">
            {isOrganizer ? "Organizer" : "Attendee"}
          </div>
          <p className="mt-1 text-[13px] text-ink-600 max-w-prose">
            {isOrganizer
              ? "You can publish events, manage attendees, and accept payments."
              : "You're set up to buy tickets. Publish your first event to become an organizer — the upgrade is automatic."}
          </p>
        </div>
        {isOrganizer ? (
          <Link href="/dashboard/settings" className="btn btn-outline btn-sm">
            Open organization settings →
          </Link>
        ) : (
          <Link href="/events/new" className="btn btn-primary btn-sm">
            Host my first event
          </Link>
        )}
      </section>

      <form action={updateOrganization} className="space-y-5">
        <Field
          label="Public organizer name"
          hint="Shown as the host on every event you publish."
        >
          <input
            name="name"
            defaultValue={user.name ?? ""}
            maxLength={80}
            className="input"
            required
          />
        </Field>

        <Field
          label="About"
          hint="Up to 1000 characters. Markdown is OK."
        >
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            maxLength={1000}
            rows={5}
            className="textarea"
            placeholder="Tell attendees what you organize and why."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            <input
              name="city"
              defaultValue={user.city ?? ""}
              maxLength={80}
              className="input"
              placeholder="Toronto"
            />
          </Field>
          <Field label="Country">
            <input
              name="country"
              defaultValue={user.country ?? ""}
              maxLength={80}
              className="input"
              placeholder="Canada"
            />
          </Field>
        </div>

        <Field
          label="Community / heritage"
          hint="Optional. Shown on your public organizer page next to your name."
        >
          <input
            name="tribe"
            defaultValue={user.tribe ?? ""}
            list="tribe-suggestions"
            maxLength={40}
            className="input"
            placeholder="e.g. Filipino, Somali, Irish"
          />
          <datalist id="tribe-suggestions">
            {TRIBE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Website (optional)"
          hint="Bare domain or full https URL. We strip the protocol on display."
        >
          <input
            name="website"
            defaultValue={(user.website ?? "").replace(/^https?:\/\//i, "")}
            maxLength={200}
            className="input"
            placeholder="yourdomain.org"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>

        <div className="pt-2">
          <button type="submit" className="btn btn-primary">
            Save organization
          </button>
        </div>
      </form>

      {isOrganizer && (
        <section className="mt-12 rounded-md bg-white shadow-card p-6">
          <h2 className="font-display text-[18px] font-bold text-nile-900">
            Workspace settings
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-600 leading-relaxed max-w-prose">
            Team members, platform fees, payouts, and plan settings live in the
            organizer workspace. They affect every event you publish, not just
            your personal profile.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/settings" className="btn btn-outline btn-sm">
              Organization settings
            </Link>
            <Link href="/dashboard/payouts" className="btn btn-outline btn-sm">
              Payouts
            </Link>
            <Link href="/dashboard/finance" className="btn btn-outline btn-sm">
              Finance
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
