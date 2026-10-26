import { LOCALE_COOKIE, type Locale } from "./locales";

/** Remembers the customer's language for a year (no locale in the URL). */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
