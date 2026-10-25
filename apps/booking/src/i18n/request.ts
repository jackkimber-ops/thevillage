import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, toLocale } from "./locales";

// No locale in the URL: the customer's choice is kept in a cookie (English by default).
export default getRequestConfig(async () => {
  const locale = toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    timeZone: "Asia/Ho_Chi_Minh",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
