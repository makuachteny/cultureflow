import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardHero from "@/components/organizer/DashboardHero";
import { FEE_COOKIE_NAME, readFeeModel, type FeeModel } from "@/lib/finance";
import ProfilePhotoUpload from "@/components/organizer/ProfilePhotoUpload";
import Field from "@/components/ui/Field";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Organizer profile writes. Native HTML validation handles most shape
 * checking; we re-normalize server-side to avoid storing junk. We
 * never throw from a server action (throws render a generic error page),
 * so malformed fields are dropped silently and the form re-displays.
 */
async function updateOrgProfile(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/dashboard/settings");
  }

  const name        = String(formData.get("name")        ?? "").trim().slice(0, 80);
  const bio         = String(formData.get("bio")         ?? "").trim().slice(0, 600);
  const city        = String(formData.get("city")        ?? "").trim().slice(0, 80);
  const country     = String(formData.get("country")     ?? "").trim().slice(0, 80);
  const tribe       = String(formData.get("tribe")       ?? "").trim().slice(0, 40);
  const rawWebsite  = String(formData.get("website")     ?? "").trim().slice(0, 200);
  const rawEmail    = String(formData.get("email")       ?? "").trim().toLowerCase().slice(0, 200);
  const rawImage    = String(formData.get("image")       ?? "").trim().slice(0, 500);

  const website = rawWebsite && /^https?:\/\//i.test(rawWebsite) ? rawWebsite : null;
  const email   = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
  // Accept our own uploaded path, or a full https URL (e.g. OAuth avatar).
  const image   =
    rawImage === ""                                 ? null :
    rawImage.startsWith("/uploads/")                 ? rawImage :
    /^https:\/\//i.test(rawImage)                    ? rawImage :
                                                       null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      bio:     bio     || null,
      city:    city    || null,
      country: country || null,
      tribe:   tribe   || null,
      website,
      image,
      ...(email ? { email } : {})
    }
  });

  // Revalidate the whole dashboard layout so the TopBar (which shows the
  // user's name next to "Sign out") picks up the new name / avatar on the
  // very next render. A path-only revalidate misses the layout cache.
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?saved=1");
}

/**
 * Fee model write — persisted to a cookie rather than a column because
 * the schema doesn't carry org-level prefs yet. When the schema grows an
 * OrgPreferences row, switch this to write there and keep the cookie as
 * a fallback for unauthenticated renders.
 */
async function updateFeeModel(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/dashboard/settings?tab=fees");
  }
  const raw = String(formData.get("model") ?? "");
  const next: FeeModel = raw === "absorb" ? "absorb" : "pass_on";
  cookies().set(FEE_COOKIE_NAME, next, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/settings?tab=fees&saved=1");
}

export const dynamic = "force-dynamic";

const TABS = [
  { key: "profile",    label: "Organizer profile" },
  { key: "team",       label: "Team" },
  { key: "fees",       label: "Ticket fees" },
  { key: "plan",       label: "Plan" },
  { key: "extensions", label: "Extensions" }
] as const;
type TabKey = (typeof TABS)[number]["key"];

type SP = { tab?: string; saved?: string };

export default async function SettingsPage({ searchParams }: { searchParams?: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/settings");

  const rawTab = searchParams?.tab;
  const activeTab: TabKey = rawTab && TABS.some((t) => t.key === rawTab)
    ? (rawTab as TabKey)
    : "profile";
  const saved = searchParams?.saved === "1";

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in?callbackUrl=/dashboard/settings");

  const displayName = user.name || "Unnamed organizer";
  const heading     = (user.name || user.email || "YOUR ORGANIZATION").toUpperCase();
  const feeModel    = readFeeModel();

  return (
    <div className="w-full">
      <DashboardHero
        tone="nile"
        eyebrow={heading || "Workspace"}
        title="Organization"
        accent="settings."
        lede="Profile, team, fees, plan, extensions. The settings here apply to every event you publish under this account."
        ctas={[
          { label: "Payouts",        href: "/dashboard/payouts",            variant: "primary" },
          { label: "My account",     href: "/account/contact-info",          variant: "ghost"   }
        ]}
      />

      <div className="mb-10 flex flex-wrap items-center gap-1 sm:gap-6 border-b border-[color:var(--border-hairline)] overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/settings${t.key === "profile" ? "" : `?tab=${t.key}`}`}
            scroll={false}
            className={"tab whitespace-nowrap " + (t.key === activeTab ? "tab-active" : "")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "profile" && (
        <ProfilePanel
          name={displayName}
          email={user.email}
          website={user.website ?? ""}
          bio={user.bio ?? ""}
          city={user.city ?? ""}
          country={user.country ?? ""}
          tribe={user.tribe ?? ""}
          image={user.image ?? null}
          userId={user.id}
          saved={saved}
        />
      )}
      {activeTab === "team"       && <TeamPanel />}
      {activeTab === "fees"       && <FeesPanel model={feeModel} saved={saved} />}
      {activeTab === "plan"       && <PlanPanel />}
      {activeTab === "extensions" && <ExtensionsPanel />}
    </div>
  );
}

/* ─────────────────── Panels ─────────────────── */

function ProfilePanel({
  name, email, website, bio, city, country, tribe, image, userId, saved
}: {
  name: string; email: string; website: string; bio: string;
  city: string; country: string; tribe: string;
  image: string | null; userId: string; saved: boolean;
}) {
  const letter = (name?.[0] || email?.[0] || "?").toUpperCase();
  // Single, capped column. Photo + identity summary stack on top, the
  // editable fields stack below at the same width — every input lines
  // up to the same left/right gutter, no sidebar to fight with.
  return (
    <div className="mx-auto max-w-2xl">
      {/* ─── Profile summary (top) ─────────────────────────────── */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[color:var(--border-hairline)]">
        <div className="flex items-start gap-5">
          <ProfilePhotoUpload initialUrl={image} fallbackLetter={letter} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[20px] font-bold text-nile-900 leading-tight">
              {name || "Unnamed organizer"}
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-600 break-words">
              {email}
            </p>
            <p className="mt-3 text-[13px] text-ink-600 leading-relaxed">
              Public page:{" "}
              <Link
                href={`/profile/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono-ed text-[12.5px] text-nile hover:underline"
              >
                /profile/{userId.slice(0, 8)}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Edit form (below) ─────────────────────────────────── */}
      <form action={updateOrgProfile} className="space-y-5">
        <Field label="Organization name" hint={`${Math.min(name.length, 80)}/80`} hintPosition="right">
          <input name="name" defaultValue={name} maxLength={80} className="input" required />
        </Field>
        <Field label="Contact email">
          <input name="email" defaultValue={email} className="input" type="email" required />
        </Field>
        <Field label="Website" hint="Optional. Bare domain or full URL.">
          <input
            name="website"
            defaultValue={website}
            placeholder="https://yourdomain.org"
            className="input"
            type="url"
            pattern="https?://.*"
            title="Must start with http:// or https://"
            maxLength={200}
          />
        </Field>
        <Field label="Short bio" hint={`${Math.min(bio.length, 600)}/600`} hintPosition="right">
          <textarea
            name="bio"
            defaultValue={bio}
            maxLength={600}
            rows={4}
            className="input min-h-28 py-2"
            placeholder="Who are you and what kind of events do you run?"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City">
            <input name="city" defaultValue={city} maxLength={80} className="input" placeholder="Toronto" />
          </Field>
          <Field label="Country">
            <input name="country" defaultValue={country} maxLength={80} className="input" placeholder="Canada" />
          </Field>
        </div>
        <Field label="Community or heritage" hint="Optional. Shown on your public page next to your name.">
          <input name="tribe" defaultValue={tribe} maxLength={40} className="input" placeholder="Yoruba, Punjabi, Irish…" />
        </Field>

        <div className="flex items-center justify-end gap-4 pt-3">
          {saved && (
            <div role="status" className="text-sm font-semibold text-acacia-600">
              Saved ✓
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function TeamPanel() {
  return (
    <PanelShell
      title="Team"
      blurb="Invite co-organizers, give them roles, and remove access when they move on."
    >
      <div className="card p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-nile-50 text-nile shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
              <circle cx="9" cy="8" r="4" />
              <circle cx="17" cy="10" r="3" />
              <path d="M2 21a7 7 0 0114 0M14 17a5 5 0 018 0" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-nile">Multi-organizer teams land next release</h3>
            <p className="mt-2 text-sm text-ink-600 max-w-lg">
              Today every event belongs to a single organizer account. We're building role-based
              access (owner, editor, check-in crew) on top of the existing auth system — the next
              release ships with it enabled by default.
            </p>
            <p className="mt-3 text-[13px] text-ink-500">
              Need a workaround in the meantime? Share your organizer login with a trusted
              co-organizer — just rotate the password after the event.
            </p>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function FeesPanel({ model, saved }: { model: FeeModel; saved: boolean }) {
  return (
    <PanelShell
      title="Ticket fees"
      blurb="Decide who pays the service fee on paid tickets. Applies to every paid event until you change it."
    >
      <form action={updateFeeModel} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <FeeOption
            name="model"
            value="pass_on"
            label="Pass fees to attendees"
            blurb="Attendees pay the listed ticket price plus the service fee. You receive the full ticket price."
            active={model === "pass_on"}
          />
          <FeeOption
            name="model"
            value="absorb"
            label="Absorb fees"
            blurb="The service fee is deducted from the ticket price you set. Attendees pay only the listed price."
            active={model === "absorb"}
          />
        </div>
        <p className="text-[13px] text-ink-500">
          Rates: 2.9% + $0.50 per card ticket · 2.5% + $0.25 per mobile-money ticket.
        </p>
        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-primary">Save fee model</button>
          {saved && (
            <span role="status" className="text-sm font-semibold text-acacia-600">Saved ✓</span>
          )}
        </div>
      </form>
    </PanelShell>
  );
}

function PlanPanel() {
  return (
    <PanelShell
      title="Plan"
      blurb="You're on the free plan. Premium launches with discounted fees and priority support."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-6 ring-2 ring-nile">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-nile">Free</span>
            <span className="inline-flex items-center rounded-full bg-nile-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-nile">
              Current
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <Bullet>Unlimited free events</Bullet>
            <Bullet>Unlimited paid events (standard fees apply)</Bullet>
            <Bullet>Cards, Apple Pay, Google Pay, and mobile money</Bullet>
            <Bullet>Community page + follower notifications</Bullet>
          </ul>
        </div>

        <div className="card p-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-gold-700">Premium</span>
            <span className="text-[12px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Coming soon</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <Bullet>Discounted service fees</Bullet>
            <Bullet>Priority check-in support on event day</Bullet>
            <Bullet>Custom branding on tickets and emails</Bullet>
            <Bullet>Team roles + shared inbox</Bullet>
          </ul>
          <Link href="/contact?topic=premium" className="btn btn-ghost mt-5">
            Get notified
          </Link>
        </div>
      </div>
    </PanelShell>
  );
}

function ExtensionsPanel() {
  const extensions = [
    { name: "Google Calendar", blurb: "Auto-add new events to your calendar.", icon: "📅" },
    { name: "Mailchimp",       blurb: "Sync attendee emails into your audiences.", icon: "✉️" },
    { name: "Zoom",            blurb: "Create Zoom links when you publish online events.", icon: "🎥" },
    { name: "Slack",           blurb: "Notify your team when tickets hit milestones.", icon: "💬" }
  ];
  return (
    <PanelShell
      title="Extensions"
      blurb={`Connect ${BRAND_NAME} to the tools you already use — calendars, messaging, analytics, and more.`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {extensions.map((x) => (
          <div key={x.name} className="card p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-nile">{x.name}</div>
              <div className="text-[13px] text-ink-600">{x.blurb}</div>
            </div>
            <span className="inline-flex items-center rounded-full bg-cream-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-600 shrink-0">
              Coming soon
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ink-500">
        Want to build an integration?{" "}
        <Link href="/contact?topic=extensions" className="text-nile font-semibold hover:underline">
          Tell us which tool you need.
        </Link>
      </p>
    </PanelShell>
  );
}

/* ─────────────────── Shared bits ─────────────────── */

function PanelShell({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 font-display text-[22px] font-bold text-nile-900">{title}</h2>
      <p className="mb-6 max-w-2xl text-sm text-ink-600">{blurb}</p>
      {children}
    </section>
  );
}

function FeeOption({
  name, value, label, blurb, active
}: {
  name: string; value: string; label: string; blurb: string; active: boolean;
}) {
  return (
    <label className={"card p-4 cursor-pointer motion-safe:transition-shadow " + (active ? "ring-2 ring-nile" : "hover:ring-1 hover:ring-nile-200")}>
      <div className="flex items-center gap-2">
        <input
          type="radio"
          name={name}
          value={value}
          defaultChecked={active}
          className="sr-only peer"
        />
        <span
          aria-hidden
          className={"h-4 w-4 rounded-full border-2 transition-colors " + (active ? "bg-nile border-nile" : "border-ink-400 peer-checked:bg-nile peer-checked:border-nile")}
        />
        <span className="font-semibold text-ink-900">{label}</span>
      </div>
      <p className="mt-2 text-[13px] text-ink-600 leading-relaxed">{blurb}</p>
    </label>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 text-acacia-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span className="text-ink">{children}</span>
    </li>
  );
}
