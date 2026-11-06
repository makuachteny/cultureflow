"use client";

/**
 * Organizer check-in panel — type the 6-char code (or paste a scanned
 * qrData value) and submit. Shows the last 20 successful check-ins
 * inline so the door person can see the running list.
 */

import { useState } from "react";

type CheckedTicket = {
  id: string;
  code: string;
  attendeeName: string;
  tier: string;
  event: { slug: string; title: string };
  checkedInAt: string | Date;
};

export default function CheckInClient({ eventId: _eventId }: { eventId: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckedTicket[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    try {
      // Accept short human codes as `code`; longer opaque tokens as `qrData`.
      const payload = trimmed.length <= 12
        ? { code: trimmed }
        : { qrData: trimmed };
      const res = await fetch("/api/tickets/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Error (${res.status})`);
        return;
      }
      setHistory((h) => [data.ticket as CheckedTicket, ...h].slice(0, 20));
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={submit} className="card p-4">
        <label htmlFor="check-in-code" className="block text-sm font-semibold text-ink">
          Ticket code
        </label>
        <p className="text-[12px] text-ink-500 mt-0.5">
          Type the 6-character code or paste the QR value.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            id="check-in-code"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="input font-mono-ed flex-1 uppercase tracking-[0.2em]"
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" disabled={busy || !code.trim()} className="btn btn-primary">
            {busy ? "Checking…" : "Check in"}
          </button>
        </div>
        {error && (
          <div role="alert" className="mt-3 text-sm font-semibold text-hibiscus">
            {error}
          </div>
        )}
      </form>

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold text-nile">Recent check-ins</h2>
          <ul className="mt-3 divide-y divide-nile-100">
            {history.map((t) => (
              <li key={t.id} className="py-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-acacia-50 text-acacia-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink truncate">{t.attendeeName}</div>
                  <div className="text-[12px] text-ink-500">
                    {t.tier} · <span className="font-mono-ed">{t.code}</span>
                  </div>
                </div>
                <span className="text-[12px] text-ink-500">
                  {new Date(t.checkedInAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
