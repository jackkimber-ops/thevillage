import type { MetadataRoute } from "next";

// C9: customers save the booking site to their phone's home screen and it opens like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The Village - Family Club",
    short_name: "The Village",
    description: "Book classes and open play at The Village - Family Club, Saigon.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff4e6",
    theme_color: "#c3bf94",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
