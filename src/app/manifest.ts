import type { MetadataRoute } from "next";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

/** Web app manifest — installable PWA with the flag-blue cow icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0F47AF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/logo-app-icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
