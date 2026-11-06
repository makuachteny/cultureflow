"use client";

import { signOut } from "next-auth/react";

/**
 * Header logout — sits next to the avatar in the dashboard TopBar.
 * Icon-only on small screens; gains a "Log out" label from sm: up. The
 * dashboard sidebar no longer carries this action — the header is the
 * single place to sign out.
 */
export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      aria-label="Log out"
      title="Log out"
      className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full text-[13px] font-semibold text-ink-700 hover:text-hibiscus hover:bg-hibiscus/5 transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 17l5-5-5-5" />
        <path d="M20 12H9" />
        <path d="M13 21H5a2 2 0 01-2-2V5a2 2 0 012-2h8" />
      </svg>
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
