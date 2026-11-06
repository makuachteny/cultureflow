"use client";

/**
 * AdminBrowser — Users | Events tabs + search, sharing one unified row
 * layout. The server fetches up to a few dozen recent rows of each type;
 * filtering/searching runs entirely on the client so swapping tabs and
 * typing in the search box stays instant.
 *
 * Both lists ship the same column widths so the right-anchored Actions
 * lane sits on a perfectly straight vertical line whether the user is
 * looking at the Users tab or the Events tab.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import AdminActions from "@/components/AdminActions";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN";
  status: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  bannerUrl: string | null;
  startsAt: string;             // ISO
  organizerName: string | null;
};

type Props = {
  users:  UserRow[];
  events: EventRow[];
};

type Tab = "users" | "events";

export default function AdminBrowser({ users, events }: Props) {
  // Honour `?tab=events` / `?tab=users` so the KPI cards on the page
  // can deep-link into the right tab. Falls back to "users" otherwise.
  const search = useSearchParams();
  const initialTab: Tab = search?.get("tab") === "events" ? "events" : "users";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q,   setQ]   = useState("");

  const term = q.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!term) return users;
    return users.filter((u) =>
      (u.name ?? "").toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }, [users, term]);

  const filteredEvents = useMemo(() => {
    if (!term) return events;
    return events.filter((e) =>
      e.title.toLowerCase().includes(term) ||
      (e.organizerName ?? "").toLowerCase().includes(term) ||
      e.status.toLowerCase().includes(term)
    );
  }, [events, term]);

  const activeCount = tab === "users" ? filteredUsers.length : filteredEvents.length;
  const totalCount  = tab === "users" ? users.length         : events.length;

  return (
    <section>
      {/* Tabs + search */}
      <div className="mb-4 flex flex-wrap items-center gap-3 px-1">
        <div
          role="tablist"
          aria-label="Recent records"
          className="inline-flex items-center rounded-full bg-cream-100 ring-1 ring-[color:var(--border-hairline)] p-1"
        >
          <Tab
            label="Users"
            count={users.length}
            active={tab === "users"}
            onClick={() => setTab("users")}
          />
          <Tab
            label="Events"
            count={events.length}
            active={tab === "events"}
            onClick={() => setTab("events")}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12.5px] text-ink-500 font-tabular">
            {term ? `${activeCount} of ${totalCount}` : `Newest ${totalCount}`}
          </span>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={tab === "users" ? "Find a user…" : "Find an event…"}
          />
        </div>
      </div>

      {/* List container — same shape for both tabs */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[color:var(--border-hairline)] overflow-hidden">
        {tab === "users" ? (
          <UsersList rows={filteredUsers} empty={emptyText(term, "users")} />
        ) : (
          <EventsList rows={filteredEvents} empty={emptyText(term, "events")} />
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── Tabs ─────────────────────────── */

function Tab({
  label, count, active, onClick
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[13px] font-semibold motion-safe:transition-colors " +
        (active
          ? "bg-white text-nile-900 shadow-sm ring-1 ring-[color:var(--border-hairline)]"
          : "text-ink-600 hover:text-nile-900")
      }
    >
      {label}
      <span className={
        "inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[11px] font-bold font-tabular " +
        (active ? "bg-nile-50 text-nile-700" : "bg-white/70 text-ink-500")
      }>
        {count}
      </span>
    </button>
  );
}

/* ─────────────────────────── Search ─────────────────────────── */

function SearchInput({
  value, onChange, placeholder
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative inline-flex items-center">
      <svg
        viewBox="0 0 24 24"
        className="absolute left-3 h-4 w-4 text-ink-500 pointer-events-none"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="input !h-9 !pl-9 !pr-3 w-56 sm:w-72 text-[13px]"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </label>
  );
}

/* ─────────────────────────── Lists ─────────────────────────── */

function UsersList({ rows, empty }: { rows: UserRow[]; empty: string }) {
  return (
    <>
      <ListHeader cols={["Name", "Role", "Status", ""]} />
      {rows.length === 0 ? (
        <EmptyRow text={empty} />
      ) : (
        <ul className="divide-y divide-[color:var(--border-hairline)]">
          {rows.map((u) => {
            const initial = (u.name?.[0] ?? u.email?.[0] ?? "?").toUpperCase();
            return (
              <li
                key={u.id}
                className="grid grid-cols-[minmax(0,1fr)_120px_120px_220px] items-center gap-4 px-5 sm:px-6 py-4 hover:bg-cream-50/50 motion-safe:transition-colors"
              >
                <Link
                  href={`/organizer/${u.id}`}
                  className="flex items-center gap-3 min-w-0 group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile/40"
                >
                  {u.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.image}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[color:var(--border-hairline)]"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nile text-[12.5px] font-bold text-white">
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900 truncate group-hover:text-nile motion-safe:transition-colors">
                      {u.name ?? "—"}
                    </div>
                    <div className="text-[12.5px] text-ink-500 truncate">{u.email}</div>
                  </div>
                </Link>
                <div className="hidden sm:block">
                  <RolePill role={u.role} />
                </div>
                <div className="hidden md:block">
                  <StatusPill status={u.status} />
                </div>
                <div className="flex justify-end">
                  <AdminActions kind="user" id={u.id} status={u.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function EventsList({ rows, empty }: { rows: EventRow[]; empty: string }) {
  return (
    <>
      <ListHeader cols={["Event", "Organizer", "Status", ""]} />
      {rows.length === 0 ? (
        <EmptyRow text={empty} />
      ) : (
        <ul className="divide-y divide-[color:var(--border-hairline)]">
          {rows.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[minmax(0,1fr)_120px_120px_220px] items-center gap-4 px-5 sm:px-6 py-4 hover:bg-cream-50/50 motion-safe:transition-colors"
            >
              <Link
                href={`/events/${e.slug}`}
                className="flex items-center gap-3 min-w-0 group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile/40"
              >
                <div
                  className="h-9 w-14 shrink-0 rounded-md bg-cover bg-center bg-nile-50 ring-1 ring-[color:var(--border-hairline)]"
                  style={e.bannerUrl ? { backgroundImage: `url(${e.bannerUrl})` } : undefined}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="font-semibold text-ink-900 truncate group-hover:text-nile motion-safe:transition-colors">
                    {e.title}
                  </div>
                  <div className="text-[12.5px] text-ink-500 truncate">
                    {e.featured && <span className="font-semibold text-gold-700">Featured · </span>}
                    {new Date(e.startsAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </div>
                </div>
              </Link>
              <div className="hidden sm:block text-[13px] text-ink-700 truncate">
                {e.organizerName ?? "—"}
              </div>
              <div className="hidden md:block">
                <StatusPill status={e.status} />
              </div>
              <div className="flex justify-end">
                <AdminActions kind="event" id={e.id} status={e.status} featured={e.featured} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function ListHeader({ cols }: { cols: [string, string, string, string] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_220px] items-center gap-4 px-5 sm:px-6 py-3 bg-cream-100 border-b border-[color:var(--border-hairline)] text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-600">
      <div className="min-w-0">{cols[0]}</div>
      <div className="hidden sm:block">{cols[1]}</div>
      <div className="hidden md:block">{cols[2]}</div>
      <div className="text-right">{cols[3]}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="px-5 sm:px-6 py-10 text-center text-[13.5px] text-ink-500">
      {text}
    </div>
  );
}

function RolePill({ role }: { role: "ATTENDEE" | "ORGANIZER" | "ADMIN" }) {
  const cls =
    role === "ADMIN"     ? "bg-hibiscus/15 text-hibiscus ring-1 ring-inset ring-hibiscus/40" :
    role === "ORGANIZER" ? "bg-nile-100    text-nile-700  ring-1 ring-inset ring-nile/30"   :
                           "bg-cream-200   text-ink-700";
  return (
    <span className={"inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] " + cls}>
      {role.toLowerCase()}
    </span>
  );
}

function emptyText(term: string, kind: "users" | "events"): string {
  if (term) return `No ${kind} match "${term}".`;
  return kind === "users" ? "No users yet." : "No events yet.";
}
