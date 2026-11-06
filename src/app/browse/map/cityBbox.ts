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
  "juba":      { bbox: "31.50,4.74,31.72,4.94",   marker: [4.8594, 31.5713] },
  "wau":       { bbox: "27.93,7.62,28.12,7.80",   marker: [7.7000, 28.0167] },
  "khartoum":  { bbox: "32.40,15.42,32.74,15.78", marker: [15.5007, 32.5599] },
  "nairobi":   { bbox: "36.66,-1.44,37.10,-1.16", marker: [-1.2921, 36.8219] },
  "kampala":   { bbox: "32.45,0.23,32.71,0.42",   marker: [0.3476, 32.5825] },
  "cairo":     { bbox: "31.10,29.93,31.45,30.18", marker: [30.0444, 31.2357] },
  "london":    { bbox: "-0.51,51.29,0.34,51.69",  marker: [51.5074, -0.1278] },
  "toronto":   { bbox: "-79.64,43.58,-79.11,43.86", marker: [43.6532, -79.3832] },
  "calgary":   { bbox: "-114.32,50.84,-113.86,51.21", marker: [51.0447, -114.0719] },
  "melbourne": { bbox: "144.59,-38.20,145.51,-37.55", marker: [-37.8136, 144.9631] },
  "sydney":    { bbox: "150.85,-34.17,151.34,-33.57", marker: [-33.8688, 151.2093] },
  "omaha":     { bbox: "-96.20,41.18,-95.86,41.40", marker: [41.2565, -95.9345] }
};

export function bboxForCity(city: string): BBox {
  return CITY_BBOX[city.trim().toLowerCase()] ?? WORLD;
}
