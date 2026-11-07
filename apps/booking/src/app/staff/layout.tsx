import type { Metadata, Viewport } from "next";

// Every staff page (log in included): saved to the home screen it's "Village Staff", with its own icon
// (app/staff/apple-icon.png for iPhone; the manifest's icons for Android),
// and opens the staff app, not the customer site (Jack, 7 Nov).
export const metadata: Metadata = {
  title: "The Village - Staff",
  manifest: "/staff/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Village Staff", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#5e5b3b" };

export default function StaffRootLayout({ children }: LayoutProps<"/staff">) {
  return children;
}
