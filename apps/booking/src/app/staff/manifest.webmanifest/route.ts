import type { MetadataRoute } from "next";

// The staff app saved to a phone's home screen (Jack, 7 Nov): its own name and darker icon, and it opens
// the staff app. On staff.thevillagesaigon.com that's "/"; on previews (one host for both apps) it's "/staff".
export function GET(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const start = host.toLowerCase().startsWith("staff.") ? "/" : "/staff";
  const manifest: MetadataRoute.Manifest = {
    id: "/staff",
    name: "The Village - Staff",
    short_name: "Village Staff",
    description: "The Village - Family Club staff app: sessions, check-in, customers.",
    start_url: start,
    scope: start,
    display: "standalone",
    background_color: "#fff4e6",
    theme_color: "#5e5b3b",
    icons: [
      { src: "/icons/staff-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/staff-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/staff-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
