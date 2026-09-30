import type { MetadataRoute } from "next";

/**
 * Web app manifest — lets the CRM install as a standalone app on the
 * Samsung Fold / any phone home screen (Add to Home screen).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grand Prix CRM",
    short_name: "GP CRM",
    description:
      "White-label command deck for Grand Prix Dynamics client workspaces.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060b14",
    theme_color: "#22d3ee",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
