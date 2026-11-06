"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  currentCity: string;
  cities: string[];
};

/**
 * "Browsing events in [City] ▾" picker. Clicking reveals a
 * dropdown with a "Use my current location" option, "Browse online events",
 * and a list of cities. Selecting a city navigates to /browse?city=…
 */
export default function LocationPicker({ currentCity, cities }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function pickCity(city: string) {
    setOpen(false);
    // Drop the city onto /browse — the home page doesn't honour
    // `?city=` and silently dropping the query was the old bug.
    router.push(`/browse?city=${encodeURIComponent(city)}`);
  }

  function useMyLocation() {
    setLocating(true);
    if (!navigator.geolocation) { setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => {
        // MVP: geolocation is captured but we don't reverse-geocode yet —
        // fall back to the default city list. A production build should call
        // a reverse-geocoding endpoint and pre-select the nearest match.
        setLocating(false);
        setOpen(false);
        router.push(`/browse`);
      },
      () => { setLocating(false); setOpen(false); },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-baseline gap-2 text-[16px] md:text-[18px] font-semibold leading-tight text-ink hover:text-nile transition-colors"
      >
        <span className="font-normal text-ink-700">Browsing events in</span>
        <span className="inline-flex items-center gap-0.5 text-nile">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 translate-y-0.5">
            <path d="M7 10l5 5 5-5z" />
          </svg>
          <span>{currentCity}</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-2 w-[320px] rounded-md border border-[color:var(--border-hairline)] bg-white shadow-card p-1.5"
        >
          <button
            onClick={useMyLocation}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] hover:bg-nile-50"
            disabled={locating}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-nile">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="8" />
            </svg>
            <span className="font-medium text-nile">
              {locating ? "Locating…" : "Use my current location"}
            </span>
          </button>

          <Link
            href="/browse?type=ONLINE"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] hover:bg-nile-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-nile">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M10 10l5 2-5 2z" fill="currentColor" />
            </svg>
            <span className="font-medium text-nile">Browse online events</span>
          </Link>

          <div className="my-1 h-px bg-[color:var(--border-hairline)]" />

          <div className="max-h-[240px] overflow-y-auto">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => pickCity(c)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-nile-50 ${
                  c === currentCity ? "text-nile font-semibold" : "text-ink-700"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-ink/60">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {c}
                {c === currentCity && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto h-4 w-4 text-acacia">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
