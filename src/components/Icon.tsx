/**
 * CultureFlow icon set — a small, consistent duotone library.
 *
 * Each icon is two stacked paths:
 *   • a soft `fill` layer at 18% opacity using currentColor (the "wash")
 *   • a crisp `stroke` layer at weight 1.75 on top
 *
 * This gives every icon a distinctive "filled + outlined" feel that reads
 * differently from generic Lucide/Heroicons line-art. Tints and colors are
 * controlled via parent `text-*` classes (currentColor propagates).
 *
 * Sizing: default 20px (h-5 w-5). Pass `size` for other dimensions, or use
 * Tailwind classes like `className="h-6 w-6"` on the wrapper.
 */

export type IconName =
  | "compass"      // find / explore
  | "shield-check" // safe / protected
  | "ticket"       // tickets / admission
  | "bell"         // alert / follow
  | "search"       // search / lookup
  | "card"         // payment card
  | "qr"           // QR code
  | "phone"        // mobile device
  | "megaphone"    // marketing / promote
  | "vault"        // payouts / bank
  | "infinity"     // unlimited / no-minimums
  | "check"        // confirmed / included
  | "calendar"     // date / event
  | "pin"          // location / venue
  | "clock"        // time
  | "star"         // featured / spotlight
  | "users"        // community / attendees
  | "sparkle"      // recommended / magic
  | "heart"        // saved / favorite
  | "arrow-ur";    // arrow up-right (link)

type Props = {
  name: IconName;
  /** px size; defaults to 20. */
  size?: number;
  className?: string;
  /** Hide from screen readers (decorative). Defaults true. */
  "aria-hidden"?: boolean;
};

export default function Icon({ name, size = 20, className, ...rest }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": rest["aria-hidden"] ?? true,
    fill: "none" as const
  };
  const [washD, lineD] = PATHS[name];

  return (
    <svg {...common}>
      {/* Wash layer — soft tinted fill using currentColor */}
      {washD && (
        <path
          d={washD}
          fill="currentColor"
          fillOpacity="0.18"
        />
      )}
      {/* Line layer */}
      <path
        d={lineD}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Per-icon paths as [washD, lineD]. The wash is usually a filled body shape
 * (e.g. shield interior, bell dome) and the line is the outline + details.
 * Passing null/empty for washD renders a pure-stroke icon.
 */
const PATHS: Record<IconName, [string | null, string]> = {
  compass: [
    "M12 3a9 9 0 100 18 9 9 0 000-18z",
    "M12 3a9 9 0 100 18 9 9 0 000-18z M15.5 8.5l-2.3 5.4-5.4 2.3 2.3-5.4 5.4-2.3z"
  ],
  "shield-check": [
    "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
    "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z M8.5 12.25l2.5 2.5 4.5-4.5"
  ],
  ticket: [
    "M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z",
    "M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z M13 7v2.5M13 11.5v1.5M13 15v2.5"
  ],
  bell: [
    "M6 10a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z",
    "M6 10a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z M10 19a2 2 0 004 0"
  ],
  search: [
    "M11 4a7 7 0 100 14 7 7 0 000-14z",
    "M11 4a7 7 0 100 14 7 7 0 000-14z M20.5 20.5l-4.2-4.2"
  ],
  card: [
    "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
    "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M3 10.5h18 M7 15.5h3"
  ],
  qr: [
    "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z",
    "M4 4h6v6H4V4z M14 4h6v6h-6V4z M4 14h6v6H4v-6z M14 14h2.5M19 14v2.5 M14 17.5v2.5M17 20h3"
  ],
  phone: [
    "M7 3.5a2 2 0 012-2h6a2 2 0 012 2v17a2 2 0 01-2 2H9a2 2 0 01-2-2v-17z",
    "M7 3.5a2 2 0 012-2h6a2 2 0 012 2v17a2 2 0 01-2 2H9a2 2 0 01-2-2v-17z M10 5.5h4 M11 19h2"
  ],
  megaphone: [
    "M3 10a2 2 0 012-2h2l7-4v14l-7-4H5a2 2 0 01-2-2v-2z",
    "M3 10a2 2 0 012-2h2l7-4v14l-7-4H5a2 2 0 01-2-2v-2z M17 8a4.5 4.5 0 010 8 M8 16v3"
  ],
  vault: [
    "M3 5h18v14H3z",
    "M3 5h18v14H3V5z M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z M12 7.6V9M12 15v1.4M7.8 12H9.2M14.8 12h1.4"
  ],
  infinity: [
    null,
    "M7.2 12a3.2 3.2 0 116.4 0 3.2 3.2 0 106.4 0 3.2 3.2 0 10-6.4 0 3.2 3.2 0 11-6.4 0z"
  ],
  check: [
    "M12 3a9 9 0 100 18 9 9 0 000-18z",
    "M12 3a9 9 0 100 18 9 9 0 000-18z M8 12l2.8 2.8L16 9.6"
  ],
  calendar: [
    "M4 6h16v14H4z",
    "M4 6a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6z M4 10h16 M8 3.5v3 M16 3.5v3"
  ],
  pin: [
    "M12 21s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z",
    "M12 21s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z M12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"
  ],
  clock: [
    "M12 3a9 9 0 100 18 9 9 0 000-18z",
    "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2"
  ],
  star: [
    "M12 3.5l2.65 5.88L21 10.3l-4.72 4.18L17.7 20.5 12 17.2 6.3 20.5l1.42-6.02L3 10.3l6.35-.92z",
    "M12 3.5l2.65 5.88L21 10.3l-4.72 4.18L17.7 20.5 12 17.2 6.3 20.5l1.42-6.02L3 10.3l6.35-.92z"
  ],
  users: [
    "M9 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z",
    "M9 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z M3 20.5a6 6 0 1112 0 M17 9a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z M15 19.5a5 5 0 016-4.9"
  ],
  sparkle: [
    null,
    "M12 3l1.6 4.8L18 9l-4.4 1.2L12 15l-1.6-4.8L6 9l4.4-1.2L12 3z M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z"
  ],
  heart: [
    "M12 20s-7.5-4.6-7.5-10.5A4.5 4.5 0 019 5c1.7 0 3 .9 3.8 2.2C13.5 5.9 14.8 5 16.5 5A4.5 4.5 0 0121 9.5c0 5.9-7.5 10.5-9 10.5",
    "M12 20s-7.5-4.6-7.5-10.5A4.5 4.5 0 019 5c1.7 0 3 .9 3.8 2.2C13.5 5.9 14.8 5 16.5 5A4.5 4.5 0 0121 9.5c0 5.9-7.5 10.5-9 10.5z"
  ],
  "arrow-ur": [
    null,
    "M7 17L17 7 M9 7h8v8"
  ]
};
