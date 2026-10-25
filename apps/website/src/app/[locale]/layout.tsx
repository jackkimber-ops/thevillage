import type { Metadata } from "next";
import { Lexend_Deca, Work_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const lexend = Lexend_Deca({ variable: "--font-heading", subsets: ["latin", "vietnamese"] });
const workSans = Work_Sans({ variable: "--font-body", subsets: ["latin", "vietnamese"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL("https://thevillagesaigon.com"),
    title: t("title"),
    description: t("description"),
    alternates: { canonical: locale === "en" ? "/" : "/vi", languages: { en: "/", vi: "/vi" } },
    openGraph: { title: t("title"), description: t("description"), locale: locale === "vi" ? "vi_VN" : "en_GB", type: "website", images: ["/brand/badge-linen-full-colour.png"] },
    icons: { icon: "/brand/icon-house-linen-badge.png" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${lexend.variable} ${workSans.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
