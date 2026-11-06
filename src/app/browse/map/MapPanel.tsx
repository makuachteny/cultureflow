import { bboxForCity } from "./cityBbox";

/**
 * MapPanel — OpenStreetMap iframe framed on the active city. Zero-JS,
 * no API key, renders server-side. The "View map" overlay at center
 * mirrors the screenshot and deep-links the visitor to a full-page
 * OSM view that supports zoom/pan gestures without blocking scroll on
 * the results column.
 */
export default function MapPanel({ city }: { city: string }) {
  const { bbox, marker } = bboxForCity(city);
  const src  = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker[0]},${marker[1]}`;
  const full = `https://www.openstreetmap.org/?mlat=${marker[0]}&mlon=${marker[1]}#map=12/${marker[0]}/${marker[1]}`;
  const label = city || "the world";

  return (
    <div className="relative h-[calc(100vh-88px)] sticky top-[72px] overflow-hidden rounded-md border border-[color:var(--border-hairline)] bg-cream-100">
      <iframe
        title={`Map of ${label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full w-full border-0 [color-scheme:light]"
      />
      {/* Full-page "View map" overlay — matches the screenshot's
          centered button. Opens OSM in a new tab rather than hijacking
          the current page, which would lose the filter state. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <a
          href={full}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex items-center rounded-md border border-[color:var(--border-strong)] bg-white px-5 h-11 text-[14px] font-semibold text-ink-900 shadow-card hover:bg-cream-100 transition-colors"
        >
          View map
        </a>
      </div>
    </div>
  );
}
