"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
      aria-label="Print this ticket"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9V3h8v6" />
        <rect x="3" y="9" width="14" height="7" rx="1.5" />
        <path d="M6 13h8v4H6z" />
      </svg>
      Print ticket
    </button>
  );
}
