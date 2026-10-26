export const locales = ["en", "vi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function toLocale(value: string | undefined): Locale {
  return value === "vi" ? "vi" : defaultLocale;
}
