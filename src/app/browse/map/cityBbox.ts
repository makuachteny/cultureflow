/**
 * BBoxes for the cities we ship in FEATURED_CITIES. Used by the map view
 * to frame an OSM iframe on the selected city. The format is the one
 * OpenStreetMap's embed endpoint expects: `minLon,minLat,maxLon,maxLat`.
 *
 * When a browser hits `/browse/map` without a recognized city we fall
 * back to WORLD so the frame still renders.
 */
export type BBox = { bbox: string; marker: [number, number] };

export const WORLD: BBox = {
  bbox:   "-170,-60,170,75",
  marker: [0, 20]
};

/* Keys are lowercase city names (matching Event.city case-insensitive).
   Order mirrors FEATURED_CITIES in src/lib/taxonomy.ts. */
export const CITY_BBOX: Record<string, BBox> = {
  "new york":    { bbox: "-74.26,40.49,-73.70,40.92",   marker: [40.7128, -74.0060] },
  "london":      { bbox: "-0.51,51.29,0.34,51.69",      marker: [51.5074, -0.1278] },
  "toronto":     { bbox: "-79.64,43.58,-79.11,43.86",   marker: [43.6532, -79.3832] },
  "lagos":       { bbox: "3.10,6.39,3.70,6.70",         marker: [6.5244, 3.3792] },
  "nairobi":     { bbox: "36.66,-1.44,37.10,-1.16",     marker: [-1.2921, 36.8219] },
  "mumbai":      { bbox: "72.77,18.89,73.03,19.27",     marker: [19.0760, 72.8777] },
  "são paulo":   { bbox: "-46.83,-23.78,-46.36,-23.36", marker: [-23.5505, -46.6333] },
  "sao paulo":   { bbox: "-46.83,-23.78,-46.36,-23.36", marker: [-23.5505, -46.6333] },
  "mexico city": { bbox: "-99.36,19.18,-98.94,19.59",   marker: [19.4326, -99.1332] },
  "paris":       { bbox: "2.22,48.81,2.47,48.91",       marker: [48.8566, 2.3522] },
  "seoul":       { bbox: "126.76,37.43,127.18,37.70",   marker: [37.5665, 126.9780] },
  "sydney":      { bbox: "150.85,-34.17,151.34,-33.57", marker: [-33.8688, 151.2093] },
  "juba":        { bbox: "31.50,4.74,31.72,4.94",       marker: [4.8594, 31.5713] }
};

export function bboxForCity(city: string): BBox {
  return CITY_BBOX[city.trim().toLowerCase()] ?? WORLD;
}
