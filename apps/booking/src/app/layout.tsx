import type { Metadata, Viewport } from "next";
import { Lexend_Deca, Work_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { TrackMoves } from "@/components/RememberPlace";
import { CatchInstallOffer } from "@/components/HomeScreenTip";
import "./globals.css";

const lexend = Lexend_Deca({ variable: "--font-heading", subsets: ["latin", "vietnamese"] });
const workSans = Work_Sans({ variable: "--font-body", subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "The Village - Family Club",
  description: "Book classes and open play at The Village - Family Club, Saigon.",
  // Saved to an iPhone home screen (C9): opens full screen, named "The Village" under the icon (app/apple-icon.png).
  appleWebApp: { capable: true, title: "The Village", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#c3bf94" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${lexend.variable} ${workSans.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <TrackMoves />
        <CatchInstallOffer />
      </body>
    </html>
  );
}
