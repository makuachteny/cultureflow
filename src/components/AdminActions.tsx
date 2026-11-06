"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Inline moderation actions used by the admin page row layout.
 *
 * Compact, btn-sm-sized so two actions still fit comfortably in a
 * fixed Actions column without wrapping. Each action calls
 * /api/admin/action with the row's kind + id and refreshes the
 * route on success — the new server-rendered status pill flips on
 * the next paint, no client-side optimistic shuffle needed.
 */

type Props =
  | { kind: "user";  id: string; status: string }
  | { kind: "event"; id: string; status: string; featured: boolean };

export default function AdminActions(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function act(action: string) {
    start(async () => {
      await fetch("/api/admin/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: p.kind, id: p.id, action })
      });
      router.refresh();
    });
  }

  if (p.kind === "user") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {p.status === "ACTIVE" ? (
          <ActionBtn onClick={() => act("suspend")} pending={pending} tone="danger">
            Suspend
          </ActionBtn>
        ) : (
          <ActionBtn onClick={() => act("unsuspend")} pending={pending} tone="ghost">
            Unsuspend
          </ActionBtn>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <ActionBtn
        onClick={() => act(p.featured ? "unfeature" : "feature")}
        pending={pending}
        tone="ghost"
      >
        {p.featured ? "Unfeature" : "Feature"}
      </ActionBtn>
      {p.status === "PUBLISHED" ? (
        <ActionBtn onClick={() => act("unlist")} pending={pending} tone="danger">
          Unlist
        </ActionBtn>
      ) : (
        <ActionBtn onClick={() => act("publish")} pending={pending} tone="primary">
          Publish
        </ActionBtn>
      )}
    </div>
  );
}

function ActionBtn({
  onClick, pending, tone, children
}: {
  onClick: () => void;
  pending: boolean;
  tone: "ghost" | "primary" | "danger";
  children: React.ReactNode;
}) {
  const cls = {
    ghost:   "border border-[color:var(--border-hairline)] bg-white text-ink-800 hover:border-nile/40 hover:text-nile",
    primary: "bg-nile text-white hover:bg-nile-700",
    danger:  "border border-hibiscus/40 bg-white text-hibiscus hover:bg-hibiscus/10"
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={
        "inline-flex items-center justify-center h-8 px-3 rounded-md text-[12.5px] font-semibold motion-safe:transition-colors disabled:opacity-50 disabled:cursor-not-allowed " +
        cls
      }
    >
      {children}
    </button>
  );
}
