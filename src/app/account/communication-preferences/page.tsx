import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import PageTitle from "../_parts/PageTitle";
import SavedPill from "../_parts/SavedPill";

/**
 * Communication preferences. The user model doesn't carry a prefs
 * column yet, so we persist picks to a single JSON cookie until a
 * proper `CommunicationPreference` row lands in the schema. The
 * cookie is httpOnly so client JS can't scrape it.
 */

type Pref = { id: string; label: string; blurb: string; defaultOn: boolean };

const PREFS: Pref[] = [
  { id: "newsletter", label: "CultureFlow newsletter", blurb: "Monthly roundup of South Sudanese events across the diaspora.", defaultOn: true  },
  { id: "nearby",     label: "Events near you",     blurb: "When new events are listed in your city.",                   defaultOn: true  },
  { id: "followed",   label: "Followed organizers", blurb: "When an organizer you follow publishes a new event.",        defaultOn: true  },
  { id: "reminders",  label: "Event reminders",     blurb: "24 hours before and on the day of events you're attending.", defaultOn: true  },
  { id: "product",    label: "Product updates",     blurb: "Feature announcements and platform news.",                   defaultOn: false },
  { id: "surveys",    label: "Surveys",             blurb: "Occasional short research surveys — help shape the product.", defaultOn: false }
];

const COOKIE = "tribe.commprefs";
const VALID_IDS: ReadonlySet<string> = new Set(PREFS.map((p) => p.id));

async function updatePrefs(formData: FormData) {
  "use server";
  // Only accept keys we know about — prevents an attacker stuffing the
  // cookie with arbitrary junk via a crafted form post.
  const picked: string[] = [];
  for (const id of VALID_IDS) {
    if (formData.get(id) === "on") picked.push(id);
  }
  cookies().set(COOKIE, JSON.stringify(picked), {
    httpOnly: true,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 365,
    path:     "/"
  });
  revalidatePath("/account/communication-preferences");
  redirect("/account/communication-preferences?saved=1");
}

function readPrefs(): Set<string> {
  try {
    const raw = cookies().get(COOKIE)?.value;
    if (!raw) return new Set(PREFS.filter((p) => p.defaultOn).map((p) => p.id));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("bad shape");
    return new Set(parsed.filter((x): x is string => typeof x === "string" && VALID_IDS.has(x)));
  } catch {
    return new Set(PREFS.filter((p) => p.defaultOn).map((p) => p.id));
  }
}

export default function CommunicationPreferencesPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  const current = readPrefs();
  const saved = searchParams?.saved === "1";

  return (
    <>
      <PageTitle>Communication Preferences</PageTitle>
      <p className="mb-6 max-w-2xl text-[14px] text-ink-700">
        Choose which emails you&apos;d like to receive. Transactional emails
        (ticket receipts, refunds, login alerts) are always on.
      </p>

      <form action={updatePrefs} className="max-w-2xl space-y-3">
        {PREFS.map((p) => (
          <label
            key={p.id}
            className="flex items-start justify-between gap-4 rounded-md border border-[color:var(--border-hairline)] bg-white px-4 py-3 hover:border-nile-200 transition-colors"
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-ink-900">{p.label}</span>
              <span className="block text-[12px] text-ink-600">{p.blurb}</span>
            </span>
            <input
              type="checkbox"
              name={p.id}
              defaultChecked={current.has(p.id)}
              className="mt-1 h-5 w-5 accent-nile"
            />
          </label>
        ))}
        <div className="flex items-center justify-end gap-4 pt-2">
          {saved && <SavedPill />}
          <button type="submit" className="btn btn-primary">Save preferences</button>
        </div>
      </form>
    </>
  );
}
