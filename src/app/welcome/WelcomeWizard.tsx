"use client";

/**
 * Three-step welcome wizard — onboarding flow for new accounts.
 *
 *   Step 1 — "Welcome to CultureFlow!"    → intent: find / host / tickets
 *   Step 2 — "Tell us what you love"       → pick interests + city + tribe
 *   Step 3 — "Follow organizers"           → optional follows + email opt-in
 *
 * Everything is POSTed to /api/onboarding at the end. The user can skip
 * any step; interests are saved server-side so they work for the "For you"
 * feed even if partial.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { CATEGORIES, TRIBE_SUGGESTIONS } from "@/lib/taxonomy";

type Organizer = {
  id: string;
  name: string;
  image: string | null;
  city: string | null;
  country: string | null;
  eventCount: number;
  followerCount: number;
};

type Props = {
  user: {
    name: string;
    email: string;
    city: string;
    tribe: string;
    interests: string[];
  };
  citySuggestions: string[];
  organizers: Organizer[];
};

type Intent = "find" | "host" | "tickets" | null;
type Step = 1 | 2 | 3;

export default function WelcomeWizard({ user, citySuggestions, organizers }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [intent, setIntent] = useState<Intent>(null);
  const [city, setCity] = useState(user.city);
  const [tribe, setTribe] = useState(user.tribe);
  const [interests, setInterests] = useState<Set<string>>(new Set(user.interests));
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          interests: Array.from(interests),
          tribe: tribe || undefined,
          city:  city  || undefined,
          follow: Array.from(followed)
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save your preferences.");
        return;
      }
      // Route by intent to the right terminal destination for the user.
      if (intent === "host")    router.push("/events/new");
      else if (intent === "tickets") router.push("/tickets");
      else router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  /* Skip the wizard entirely — still has to stamp `onboardedAt` or the
     home page will just redirect back to /welcome. We POST an empty
     payload which the API accepts (interests/tribe/follow are optional). */
  async function onSkip() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusy(false);
    }
  }

  /* ────────── Shared shell ────────── */
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-[color:var(--border-hairline)] px-4 sm:px-8 py-4 flex items-center justify-between">
        <Logo variant="horizontal" size={40} href="/" />
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="text-sm font-semibold text-ink-600 hover:text-nile disabled:opacity-60"
        >
          {busy ? "Skipping…" : "Skip for now"}
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 sm:px-8 pt-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-[13px] font-semibold text-ink-600">Step {step} of 3</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-nile-100 overflow-hidden">
            <div
              className="h-full bg-nile transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 sm:py-12">
        {step === 1 && (
          <StepIntent
            name={user.name}
            intent={intent}
            setIntent={setIntent}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepInterests
            interests={interests}
            setInterests={(v) => setInterests(v)}
            toggle={toggle}
            city={city}
            setCity={setCity}
            tribe={tribe}
            setTribe={setTribe}
            citySuggestions={citySuggestions}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepFollow
            organizers={organizers}
            followed={followed}
            setFollowed={(v) => setFollowed(v)}
            toggle={toggle}
            city={city}
            onBack={() => setStep(2)}
            onFinish={finish}
            busy={busy}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   STEP 1 — "What brought you here?"
   ────────────────────────────────────────── */
function StepIntent({
  name, intent, setIntent, onNext
}: {
  name: string;
  intent: Intent;
  setIntent: (v: Intent) => void;
  onNext: () => void;
}) {
  const options: Array<{ value: Exclude<Intent, null>; label: string; blurb: string; icon: React.ReactNode }> = [
    {
      value: "find",
      label: "Find an event",
      blurb: "Browse concerts, weddings, church, sports — local and global.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
        </svg>
      )
    },
    {
      value: "host",
      label: "Host an event",
      blurb: "Publish in five minutes. Sell tickets on cards or mobile money.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    },
    {
      value: "tickets",
      label: "Find my tickets",
      blurb: "Look up a ticket you already bought.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9v6a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          <path d="M8 7v10M16 7v10" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-2 items-center">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-nile leading-tight tracking-tight">
          Welcome{name ? `, ${name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-3 text-ink-600 text-[15px] sm:text-base max-w-lg">
          Thanks for joining the tribe. What can we help you with first?
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {options.map((o) => {
            const active = intent === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setIntent(o.value)}
                aria-pressed={active}
                className={
                  "h-10 rounded-full border px-4 text-[14px] font-semibold motion-safe:transition-colors " +
                  (active
                    ? "border-nile bg-nile text-white"
                    : "border-[color:var(--border-hairline)] bg-white text-nile hover:border-nile-300 hover:bg-nile-50")
                }
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {intent && (
          <p className="mt-4 text-[14px] text-ink-600">
            {options.find((o) => o.value === intent)?.blurb}
          </p>
        )}

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={!intent}
            className="btn btn-primary"
          >
            Next
          </button>
        </div>
      </div>

      <div className="relative aspect-[4/3] rounded-md overflow-hidden shadow-card">
        <Image
          src="/community/cultural-confetti.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 600px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   STEP 2 — "Tell us what you love"
   ────────────────────────────────────────── */
function StepInterests({
  interests, setInterests, toggle,
  city, setCity, tribe, setTribe, citySuggestions,
  onBack, onNext
}: {
  interests: Set<string>;
  setInterests: (v: Set<string>) => void;
  toggle: <T>(set: Set<T>, value: T) => Set<T>;
  city: string; setCity: (v: string) => void;
  tribe: string; setTribe: (v: string) => void;
  citySuggestions: string[];
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[380px,1fr] items-start">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-nile leading-tight tracking-tight">
          Tell us <span className="text-gold-700">what you love</span>
        </h1>
        <p className="mt-3 text-ink-600 max-w-md">
          Customize your event recommendations. Pick everything that sounds fun —
          you can change it any time in settings.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Your city</span>
            <input
              list="city-suggestions"
              className="input mt-1"
              placeholder="e.g. London, Toronto, Nairobi"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <datalist id="city-suggestions">
              {citySuggestions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Your tribe or community (optional)</span>
            <input
              type="text"
              className="input mt-1"
              value={tribe}
              onChange={(e) => setTribe(e.target.value.slice(0, 40))}
              maxLength={40}
              placeholder="e.g. family, alumni, church, neighborhood…"
              list="tribe-suggestions"
            />
            <datalist id="tribe-suggestions">
              {TRIBE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
            <span className="mt-1 block text-[12px] text-ink-500">
              Used only to gate events organizers mark as tribe-specific. Type anything — any group that describes your people.
            </span>
          </label>
        </div>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={onBack} className="btn btn-ghost">Previous</button>
          <button type="button" onClick={onNext} disabled={interests.size === 0} className="btn btn-primary">
            Next
          </button>
        </div>
      </div>

      <div className="surface p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-nile">Pick your interests</h2>
          <span className="text-[13px] font-semibold text-ink-600">{interests.size} selected</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = interests.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setInterests(toggle(interests, c.key))}
                className={
                  "h-9 rounded-full border px-4 text-[13px] font-semibold motion-safe:transition-colors " +
                  (on
                    ? "border-nile bg-nile text-white"
                    : "border-[color:var(--border-hairline)] bg-white text-nile hover:border-nile-300 hover:bg-nile-50")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   STEP 3 — "Follow organizers"
   ────────────────────────────────────────── */
function StepFollow({
  organizers, followed, setFollowed, toggle,
  city,
  onBack, onFinish, busy, error
}: {
  organizers: Organizer[];
  followed: Set<string>;
  setFollowed: (v: Set<string>) => void;
  toggle: <T>(set: Set<T>, value: T) => Set<T>;
  city: string;
  onBack: () => void;
  onFinish: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[380px,1fr] items-start">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-nile leading-tight tracking-tight">
          Follow organizers
          {city && <> <span className="block sm:inline text-gold-700">in {city}</span></>}
        </h1>
        <p className="mt-3 text-ink-600 max-w-md">
          We think you&rsquo;ll love these organizers. Follow them to get notified
          when they add a new event.
        </p>

        {error && <div role="alert" className="mt-3 text-sm text-hibiscus">{error}</div>}

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={onBack} className="btn btn-ghost" disabled={busy}>
            Previous
          </button>
          <button type="button" onClick={onFinish} disabled={busy} className="btn btn-primary">
            {busy ? "Finishing…" : "Finish"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {organizers.length === 0 ? (
          <div className="card p-6 text-center text-ink-600">
            No suggestions yet — that&rsquo;s fine! You&rsquo;ll start seeing organizers
            as the community grows.
          </div>
        ) : (
          organizers.map((o) => {
            const on = followed.has(o.id);
            return (
              <div
                key={o.id}
                className="card surface-hover p-4 flex items-center gap-4"
              >
                {o.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.image} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-nile text-white grid place-items-center font-bold shrink-0">
                    {o.name[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{o.name}</div>
                  <div className="text-[13px] text-ink-500 truncate">
                    {o.eventCount} upcoming event{o.eventCount === 1 ? "" : "s"}
                    {o.city ? ` · ${o.city}${o.country ? ", " + o.country : ""}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFollowed(toggle(followed, o.id))}
                  className={
                    "btn " + (on ? "btn-ghost" : "btn-primary")
                  }
                >
                  {on ? "Following" : "Follow"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
