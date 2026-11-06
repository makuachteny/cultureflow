"use client";

import { useState } from "react";

/**
 * Share control. Uses the Web Share API on devices that support it
 * (touch, mobile browsers); falls back to copy-to-clipboard everywhere
 * else with a short "Copied" confirmation.
 */
export default function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — no-op; the button just doesn't confirm
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Share organizer profile"
      className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-nile hover:underline"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v14" />
        <path d="M6 9l6-6 6 6" />
        <path d="M5 21h14" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
