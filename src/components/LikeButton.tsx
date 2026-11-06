"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * LikeButton — heart toggle that posts to /api/likes.
 *
 * Optimistically flips the local state so the click feels instant, then
 * reconciles with the server response. On 401 it soft-redirects to
 * sign-in carrying the current URL as the callback so the user lands
 * back where they started with their intent preserved.
 *
 * Two visual variants:
 *   • "chip"   — pill with an icon + label (for cards, list rows)
 *   • "float"  — round floating action button (for event hero)
 */

type Variant = "chip" | "float";

export default function LikeButton({
  eventId,
  initialLiked,
  variant = "chip",
  onError
}: {
  eventId: string;
  initialLiked: boolean;
  variant?: Variant;
  onError?: (msg: string) => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(e: React.MouseEvent) {
    // Prevent the click from bubbling to a parent <Link> (event cards
    // wrap the whole tile in a Link to the event page).
    e.preventDefault();
    e.stopPropagation();

    const next = !liked;
    setLiked(next); // optimistic

    start(async () => {
      try {
        const res = await fetch("/api/likes", {
          method:  "POST",
          headers: { "content-type": "application/json" },
          body:    JSON.stringify({ eventId, action: next ? "like" : "unlike" })
        });
        if (res.status === 401) {
          const here = window.location.pathname + window.location.search;
          router.push(`/sign-in?callbackUrl=${encodeURIComponent(here)}`);
          return;
        }
        if (!res.ok) throw new Error(`${res.status}`);
        router.refresh();
      } catch (err) {
        setLiked(!next); // roll back
        onError?.(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const label = liked ? "Unlike" : "Save";

  if (variant === "float") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={liked}
        aria-label={label}
        disabled={pending}
        className={
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-hairline)] bg-white shadow-sm transition-colors " +
          (liked ? "text-hibiscus" : "text-ink-700 hover:text-hibiscus")
        }
      >
        <Heart filled={liked} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      disabled={pending}
      className={
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-colors " +
        (liked
          ? "border-hibiscus/40 bg-hibiscus/10 text-hibiscus"
          : "border-[color:var(--border-hairline)] bg-white text-ink-700 hover:border-[color:var(--border-strong)] hover:text-hibiscus")
      }
    >
      <Heart filled={liked} />
      <span>{liked ? "Liked" : "Like"}</span>
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}
