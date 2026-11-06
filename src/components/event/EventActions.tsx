"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/event/ShareModal";

/**
 * Top-right actions row for the event detail header — Share + Like.
 *
 * Share — opens a modal with six targets (copy-link, Facebook, Messenger,
 * LinkedIn, X/Twitter, Email). The modal owns its own state.
 *
 * Like — heart toggle persisted server-side via /api/likes. Shows up
 * in the viewer's /liked tab. An optimistic update flips the icon
 * immediately; if the server rejects we roll back.
 */
export default function EventActions({
  eventId,
  title,
  url,
  flyer,
  initialLiked = false
}: {
  eventId: string;
  title: string;
  url: string;
  /** Viewer's current like-state for this event. Server-resolved. */
  initialLiked?: boolean;
  flyer?: {
    organizer: string;
    bannerUrl: string | null;
    dateLabel: string;
    venueLabel: string;
  };
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [pending, start] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);
  const router = useRouter();

  function toggleLike() {
    const next = !liked;
    setLiked(next); // optimistic

    start(async () => {
      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventId, action: next ? "like" : "unlike" })
        });
        if (res.status === 401) {
          const here = window.location.pathname + window.location.search;
          router.push(`/sign-in?callbackUrl=${encodeURIComponent(here)}`);
          return;
        }
        if (!res.ok) throw new Error(`${res.status}`);
        router.refresh();
      } catch {
        setLiked(!next); // roll back
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share this event"
          aria-haspopup="dialog"
          aria-expanded={shareOpen}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-nile-700 hover:bg-nile-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v14" />
            <path d="M6 9l6-6 6 6" />
            <path d="M5 21h14" />
          </svg>
        </button>

        <button
          type="button"
          onClick={toggleLike}
          disabled={pending}
          aria-label={liked ? "Unlike this event" : "Like this event"}
          aria-pressed={liked}
          className={
            "inline-flex h-10 w-10 items-center justify-center rounded-full motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30 " +
            (liked ? "text-hibiscus hover:bg-hibiscus/10" : "text-nile-700 hover:bg-nile-50")
          }
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
          </svg>
        </button>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        url={url}
        flyer={flyer}
      />
    </>
  );
}
