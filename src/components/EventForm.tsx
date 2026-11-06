"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, TRIBE_SUGGESTIONS, TRIBE_VISIBILITY_OPTIONS } from "@/lib/taxonomy";
import Field from "@/components/ui/Field";

type Tier = {
  /** Present only for existing tiers (edit mode); absent for new ones. */
  id?: string;
  name: string;
  priceCents: number;
  quantity: number;
  /** How many tickets have already sold — protects delete/quantity floor. */
  sold?: number;
};
type Visibility = typeof TRIBE_VISIBILITY_OPTIONS[number]["value"];
type BannerMode = "url" | "upload";

export type EventFormInitial = {
  title: string;
  summary: string;
  description: string;
  category: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  country: string | null;
  onlineUrl: string | null;
  bannerUrl: string | null;
  capacity: number | null;
  tribeVisibility: Visibility;
  visibleTribes: string[];
  status: "DRAFT" | "PUBLISHED" | "PAST" | "CANCELLED";
  tiers: Array<{
    id: string;
    name: string;
    priceCents: number;
    quantity: number;
    sold: number;
  }>;
};

/**
 * Template starter copy. Only covers the fields a template reasonably
 * owns — title/summary/description/category/type/tiers. Dates and
 * venue stay blank; the organizer must set them.
 */
export type EventFormPreset = {
  title?: string;
  summary?: string;
  description?: string;
  category?: string;
  type?: string;
  tiers?: Array<{ name: string; priceCents: number; quantity: number }>;
};

type Props = {
  /** When set, the form edits an existing event via PATCH instead of POST. */
  eventId?: string;
  initial?: EventFormInitial;
  /** Prefill starter values (template-driven creation). Ignored if `initial` is set. */
  preset?: EventFormPreset;
};

// Format a Date for an `<input type="datetime-local">` (local, no TZ).
function toLocalInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({ eventId, initial, preset }: Props = {}) {
  const router = useRouter();
  const isEdit = !!eventId;
  // Presets only apply on create; edit mode always reads from `initial`.
  const p = isEdit ? undefined : preset;

  const [form, setForm] = useState({
    title:        initial?.title        ?? p?.title        ?? "",
    summary:      initial?.summary      ?? p?.summary      ?? "",
    description:  initial?.description  ?? p?.description  ?? "",
    category:     initial?.category     ?? p?.category     ?? "COMMUNITY",
    type:         initial?.type         ?? p?.type         ?? "IN_PERSON",
    startsAt:     initial ? toLocalInput(initial.startsAt) : "",
    endsAt:       initial ? toLocalInput(initial.endsAt)   : "",
    timezone:     initial?.timezone     ?? "UTC",
    venueName:    initial?.venueName    ?? "",
    venueAddress: initial?.venueAddress ?? "",
    city:         initial?.city         ?? "",
    country:      initial?.country      ?? "",
    onlineUrl:    initial?.onlineUrl    ?? "",
    bannerUrl:    initial?.bannerUrl    ?? "",
    capacity:     initial?.capacity != null ? String(initial.capacity) : "",
    tribeVisibility: (initial?.tribeVisibility ?? "ALL_SOUTH_SUDANESE") as Visibility
  });
  const [visibleTribes, setVisibleTribes] = useState<Set<string>>(
    new Set(initial?.visibleTribes ?? [])
  );
  const [tiers, setTiers] = useState<Tier[]>(
    initial?.tiers && initial.tiers.length > 0
      ? initial.tiers.map((t) => ({
          id: t.id,
          name: t.name,
          priceCents: t.priceCents,
          quantity: t.quantity,
          sold: t.sold
        }))
      : p?.tiers && p.tiers.length > 0
        ? p.tiers.map((t) => ({ name: t.name, priceCents: t.priceCents, quantity: t.quantity }))
        : [{ name: "General Admission", priceCents: 0, quantity: 100 }]
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Banner picker state */
  const [bannerMode, setBannerMode] = useState<BannerMode>("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v as (typeof f)[K] }));
  }
  function updateTier(i: number, patch: Partial<Tier>) {
    setTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function toggleTribe(slug: string) {
    setVisibleTribes((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function uploadBanner(file: File) {
    setUploadError(null);
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setUploadError("Use a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image is too large. Max 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }
      set("bannerUrl", data.url as string);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  async function submit(publish: boolean) {
    setError(null);
    setBusy(true);
    try {
      // Guard: SELECTED_TRIBES requires at least one tribe.
      if (form.tribeVisibility === "SELECTED_TRIBES" && visibleTribes.size === 0) {
        setError("Pick at least one tribe, or change the visibility.");
        return;
      }

      const body = {
        ...form,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        visibleTribes: form.tribeVisibility === "SELECTED_TRIBES"
          ? Array.from(visibleTribes)
          : [],
        ticketTiers: tiers.map((t) => ({
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          priceCents: Number(t.priceCents) || 0,
          quantity: Number(t.quantity) || 0,
          currency: "USD"
        })),
        publish
      };
      const res = await fetch(
        isEdit ? `/api/events/${eventId}` : "/api/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isEdit ? "Could not save changes" : "Could not create event"));
        return;
      }
      router.push(`/events/${data.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-6 card p-5 space-y-5"
      onSubmit={(e) => { e.preventDefault(); submit(true); }}
    >
      {/* ═══════ Basics ═══════ */}
      <Section title="Basics">
        <Field label="Title" required>
          <input
            className="input" required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <Field label="Short summary" required hint="A single sentence; shown in cards and listings.">
          <input
            className="input" required maxLength={200}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
          />
        </Field>

        <Field label="Description" required>
          <textarea
            className="textarea" rows={6} required
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Category">
            <select
              className="select"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              className="select"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              <option value="IN_PERSON">In person</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* ═══════ When ═══════ */}
      <Section title="When">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Starts" required>
            <input
              type="datetime-local" className="input" required
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </Field>
          <Field label="Ends" required>
            <input
              type="datetime-local" className="input" required
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ═══════ Where ═══════ */}
      <Section title="Where">
        {form.type !== "ONLINE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Venue name">
              <input className="input" placeholder="e.g. The Armory" value={form.venueName} onChange={(e) => set("venueName", e.target.value)} />
            </Field>
            <Field label="Venue address">
              <input className="input" placeholder="500 S 6th St" value={form.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} />
            </Field>
            <Field label="City">
              <input className="input" placeholder="London" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Country">
              <input className="input" placeholder="USA" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </Field>
          </div>
        )}
        {form.type !== "IN_PERSON" && (
          <Field label="Online URL">
            <input
              className="input"
              type="url"
              placeholder="Zoom, Meet, etc."
              value={form.onlineUrl}
              onChange={(e) => set("onlineUrl", e.target.value)}
            />
          </Field>
        )}
      </Section>

      {/* ═══════ Who can see this? (TRIBE VISIBILITY) ═══════ */}
      <Section
        title="Who can see this event?"
        subtitle="Choose how widely your event is discoverable within the tribe."
      >
        <div className="grid gap-2">
          {TRIBE_VISIBILITY_OPTIONS.map((opt) => {
            const selected = form.tribeVisibility === opt.value;
            return (
              <label
                key={opt.value}
                className={
                  "flex gap-3 cursor-pointer rounded-md border p-3 transition " +
                  (selected
                    ? "border-nile bg-nile-50/60 ring-1 ring-nile"
                    : "border-nile-100 hover:border-nile-200")
                }
              >
                <input
                  type="radio"
                  name="tribeVisibility"
                  value={opt.value}
                  checked={selected}
                  onChange={() => set("tribeVisibility", opt.value)}
                  className="mt-1 h-4 w-4 accent-nile"
                />
                <div>
                  <div className="font-semibold text-ink-900">{opt.label}</div>
                  <div className="text-[13px] text-ink-600 mt-0.5">{opt.help}</div>
                </div>
              </label>
            );
          })}
        </div>

        {form.tribeVisibility === "SELECTED_TRIBES" && (
          <TribeChipInput
            values={visibleTribes}
            onAdd={(v) => toggleTribe(v)}
            onRemove={(v) => toggleTribe(v)}
          />
        )}

        {form.tribeVisibility === "OWN_TRIBE" && (
          <p className="mt-2 text-[13px] text-ink-600">
            Your profile must have a tribe set for this to work. Update it in{" "}
            <Link href="/dashboard/settings" className="text-nile font-semibold hover:underline">Settings</Link>.
          </p>
        )}
      </Section>

      {/* ═══════ Media & capacity ═══════ */}
      <Section title="Media & capacity">
        <div>
          <label className="block text-sm font-semibold mb-1">Banner image</label>
          <div
            role="tablist"
            aria-label="Banner image source"
            className="inline-flex rounded-md border border-nile-100 bg-white p-0.5 mb-2"
          >
            {(["upload", "url"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={bannerMode === m}
                onClick={() => setBannerMode(m)}
                className={
                  "px-3 py-1 text-sm font-semibold rounded-none transition " +
                  (bannerMode === m
                    ? "bg-nile text-white"
                    : "text-ink-600 hover:text-ink-900")
                }
              >
                {m === "upload" ? "Upload" : "Paste URL"}
              </button>
            ))}
          </div>

          {bannerMode === "url" ? (
            <>
              <input
                className="input"
                value={form.bannerUrl}
                onChange={(e) => set("bannerUrl", e.target.value)}
                placeholder="https://…"
              />
              <p className="text-[12px] text-ink-500 mt-1">
                A 16:9 image. Paste any public URL.
              </p>
            </>
          ) : (
            <>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) uploadBanner(f);
                }}
                className={
                  "cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition " +
                  (dragOver
                    ? "border-nile bg-nile-50/60"
                    : "border-nile-100 bg-cream-100 hover:border-nile-200")
                }
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadBanner(f);
                    e.target.value = "";
                  }}
                />
                <div className="text-sm font-semibold text-ink-900">
                  {uploading ? "Uploading…" : "Click to choose a file or drop it here"}
                </div>
                <div className="text-[12px] text-ink-500 mt-1">
                  JPG, PNG, WEBP, or GIF · up to 5 MB · 16:9 recommended
                </div>
              </div>
              {uploadError && (
                <p className="text-[12px] text-hibiscus mt-1">{uploadError}</p>
              )}
            </>
          )}

          {form.bannerUrl && (
            <div className="mt-3">
              <div className="relative overflow-hidden rounded-md border border-nile-100 bg-white aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.bannerUrl}
                  alt="Banner preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                className="mt-2 text-[12px] font-semibold text-ink-600 hover:text-hibiscus"
                onClick={() => set("bannerUrl", "")}
              >
                Remove banner
              </button>
            </div>
          )}
        </div>
        <Field label="Capacity (optional)" hint="Leave blank for no cap; individual tier quantities still apply.">
          <input
            type="number" min={1} className="input"
            value={form.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            placeholder="e.g. 300"
          />
        </Field>
      </Section>

      {/* ═══════ Tickets ═══════ */}
      <Section title="Tickets">
        <div className="space-y-2">
          {tiers.map((t, i) => {
            const sold = t.sold ?? 0;
            const locked = sold > 0;
            return (
              <div key={t.id ?? `new-${i}`} className="space-y-1">
                <div className="grid grid-cols-[1fr,110px,90px,auto] gap-2 items-center">
                  <input className="input" placeholder="Tier name" value={t.name} onChange={(e) => updateTier(i, { name: e.target.value })} />
                  <input className="input" type="number" min={0} placeholder="Price ¢" value={t.priceCents} onChange={(e) => updateTier(i, { priceCents: Number(e.target.value) || 0 })} />
                  <input
                    className="input"
                    type="number"
                    min={locked ? sold : 1}
                    placeholder="Qty"
                    value={t.quantity}
                    onChange={(e) => updateTier(i, { quantity: Number(e.target.value) || 1 })}
                  />
                  <button
                    type="button"
                    aria-label={locked ? `Cannot remove — ${sold} sold` : "Remove tier"}
                    title={locked ? `${sold} ticket(s) already sold — tier can't be removed` : "Remove tier"}
                    disabled={locked}
                    className="btn btn-ghost px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => setTiers((ts) => (ts.length > 1 ? ts.filter((_, idx) => idx !== i) : ts))}
                  >
                    ✕
                  </button>
                </div>
                {locked && (
                  <p className="text-[11px] text-ink-500 pl-1">
                    {sold} sold · quantity can&rsquo;t drop below {sold}
                  </p>
                )}
              </div>
            );
          })}
          <button
            type="button" className="btn btn-ghost"
            onClick={() => setTiers((ts) => [...ts, { name: "", priceCents: 0, quantity: 50 }])}
          >
            + Add tier
          </button>
        </div>
        <p className="text-xs text-ink-500 mt-1">
          Prices are in cents. 0 = free tier. Currency defaults to USD.
        </p>
      </Section>

      {error && <div role="alert" className="text-sm text-hibiscus">{error}</div>}

      {/* ═══════ Submit ═══════ */}
      <div className="flex gap-2 justify-end pt-2 border-t border-nile-100">
        {isEdit ? (
          <>
            {initial?.status === "PUBLISHED" ? (
              <button type="button" disabled={busy} className="btn btn-ghost" onClick={() => submit(false)}>
                Unpublish
              </button>
            ) : (
              <button type="button" disabled={busy} className="btn btn-ghost" onClick={() => submit(false)}>
                Keep as draft
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary"
            >
              {busy
                ? "Saving…"
                : initial?.status === "PUBLISHED"
                  ? "Save changes"
                  : "Save & publish"}
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} className="btn btn-ghost" onClick={() => submit(false)}>
              Save draft
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Publishing…" : "Publish event"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}

/* ────────── Tiny layout helpers so form sections stay consistent ────────── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="pt-2 first:pt-0">
      <h2 className="font-display text-lg font-bold text-nile">{title}</h2>
      {subtitle && <p className="text-[13px] text-ink-600 mt-0.5">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/**
 * Free-text tribe/community chip input. Organizers type the name of any
 * tribe, society, club, or community — Enter (or comma) commits it as a
 * chip. Suggestion chips below seed the field with common groupings but
 * aren't a whitelist; any string is accepted.
 */
function TribeChipInput({
  values, onAdd, onRemove
}: {
  values: Set<string>;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim().slice(0, 40);
    if (!v) return;
    if (!values.has(v)) onAdd(v);
    setDraft("");
  }

  const unusedSuggestions = TRIBE_SUGGESTIONS.filter((s) => !values.has(s));

  return (
    <div className="mt-4 rounded-md bg-cream-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-ink-900">Pick tribes</div>
          <div className="text-[13px] text-ink-600">
            Type a tribe name and press Enter — Dinka, Nuer, Bari, your sub-clan, whatever fits.
          </div>
        </div>
        <div className="text-[13px] text-nile font-semibold">
          {values.size} added
        </div>
      </div>

      {values.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from(values).map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-nile bg-nile px-3 py-1 text-sm font-medium text-white"
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v}`}
                className="rounded-full p-0.5 -mr-1 hover:bg-white/20"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          className="input flex-1"
          value={draft}
          placeholder="Add a tribe or community…"
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && draft === "" && values.size > 0) {
              // Quick undo — delete the most recently added chip.
              const last = Array.from(values).pop()!;
              onRemove(last);
            }
          }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          className="btn btn-ghost shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {unusedSuggestions.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 mb-2">
            Suggestions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => onAdd(s)}
                className="rounded-full border border-nile-100 bg-white px-2.5 py-1 text-[12px] font-medium text-nile hover:border-nile-200 hover:bg-nile-50"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

