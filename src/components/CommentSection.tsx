"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/utils";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
};

export default function CommentSection({
  eventId, comments, canComment
}: { eventId: string; comments: Comment[]; canComment: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 422 = profile incomplete. Bounce them to /account with a
        // return param so they land back here after finishing setup.
        if (res.status === 422 && data.next) {
          const back = encodeURIComponent(window.location.pathname);
          window.location.href = `${data.next}?from=comment&return=${back}`;
          return;
        }
        setError(data.error ?? "Failed to post comment");
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-[22px] font-bold text-nile-900 tracking-tight">
        Discussion <span className="text-ink-500 font-tabular">({comments.length})</span>
      </h2>

      {canComment ? (
        <form onSubmit={onSubmit} className="mt-4 card p-4">
          <textarea
            className="textarea"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Say something — keep it kind."
          />
          {error && <div className="mt-2 text-[13px] font-semibold text-hibiscus">{error}</div>}
          <div className="mt-3 flex justify-end">
            <button disabled={busy || !body.trim()} className="btn btn-primary btn-sm">
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-[14px] text-ink-600">Sign in to join the discussion.</p>
      )}

      <ul className="mt-5 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="card p-4">
            <div className="flex items-center gap-3">
              {c.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-nile text-white grid place-items-center text-[12px] font-bold">
                  {c.user.name?.[0] ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink-900 truncate">
                  {c.user.name ?? "Anonymous"}
                </div>
                <div className="text-[12px] text-ink-500">{formatRelative(c.createdAt)}</div>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-ink-700">
              {c.body}
            </p>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-[14px] text-ink-500">No comments yet — be the first.</li>
        )}
      </ul>
    </section>
  );
}
