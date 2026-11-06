import Link from "next/link";
import Image from "next/image";

/**
 * 404 page. Mirrors the `/error` layout — same container tokens,
 * same vertical rhythm — so the two failure modes feel part of one
 * family. True vertical centring via `min-h-[80vh] flex items-center`
 * inside the root layout's `<main flex-1>`.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <span
          aria-hidden
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gold-50 ring-1 ring-gold-100"
        >
          <Image src="/logo-mark.svg" alt="" width={70} height={48} />
        </span>

        <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
          Error 404
        </div>
        <h1 className="mt-3 font-display text-[32px] sm:text-[42px] lg:text-[52px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
          Page not found
        </h1>
        <p className="mt-5 max-w-md text-[15px] sm:text-[16px] text-ink-600 leading-relaxed">
          The page you were looking for doesn&rsquo;t exist or may have moved.
          Try heading home, or browse what&rsquo;s on.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">Go home</Link>
          <Link href="/browse" className="btn btn-outline">Browse events</Link>
        </div>
      </div>
    </div>
  );
}
