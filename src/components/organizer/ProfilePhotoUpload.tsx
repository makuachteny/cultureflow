"use client";

import { useRef, useState } from "react";

/**
 * Inline profile photo uploader used in the Settings profile tab.
 * Click the avatar (or its button) to open a file picker; the image
 * POSTs to /api/uploads which returns a `/uploads/<hash>.<ext>` URL.
 * We write that URL into a hidden input so the surrounding server
 * action persists it to User.image on submit.
 *
 * Drag-and-drop is supported over the whole tile.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /^image\/(jpeg|png|webp|gif)$/;

export default function ProfilePhotoUpload({
  initialUrl,
  fallbackLetter
}: {
  initialUrl: string | null;
  fallbackLetter: string;
}) {
  const [url, setUrl] = useState<string>(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!ALLOWED.test(file.type)) {
      setError("Use a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large. Max 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Upload failed");
        return;
      }
      setUrl(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hidden input — submitted by the surrounding <form> */}
      <input type="hidden" name="image" value={url} />

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={
          "group relative cursor-pointer rounded-full transition " +
          (dragOver ? "ring-4 ring-nile" : "ring-2 ring-transparent hover:ring-2 hover:ring-nile-200")
        }
        aria-label="Change profile photo"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Profile photo"
            className="h-40 w-40 rounded-full object-cover shadow-card"
          />
        ) : (
          <div className="h-40 w-40 rounded-full bg-nile-50 text-nile flex items-center justify-center font-display text-5xl font-extrabold shadow-card">
            {fallbackLetter}
          </div>
        )}

        {/* Edit overlay on hover */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-ink-900/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em]">
            {uploading ? "Uploading…" : url ? "Change" : "Upload"}
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-nile">Profile photo</p>
        <p className="mt-1 text-[12px] text-ink-500">JPG, PNG, WEBP, or GIF · up to 5 MB</p>
      </div>

      {url && (
        <button
          type="button"
          className="text-[12px] font-semibold text-ink-600 hover:text-hibiscus"
          onClick={() => setUrl("")}
        >
          Remove photo
        </button>
      )}
      {error && <p role="alert" className="text-[12px] text-hibiscus text-center">{error}</p>}
    </div>
  );
}
