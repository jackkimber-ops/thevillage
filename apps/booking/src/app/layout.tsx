import type { Metadata } from "next";
import { Lexend_Deca, Work_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

const lexend = Lexend_Deca({ variable: "--font-heading", subsets: ["latin", "vietnamese"] });
const workSans = Work_Sans({ variable: "--font-body", subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "The Village - Family Club",
  description: "Book classes and open play at The Village - Family Club, Saigon.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${lexend.variable} ${workSans.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
