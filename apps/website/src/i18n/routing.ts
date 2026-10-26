import { defineRouting } from "next-intl/routing";

// English at /, Vietnamese at /vi (good for search engines; each language has its own address).
export const routing = defineRouting({ locales: ["en", "vi"], defaultLocale: "en", localePrefix: "as-needed" });
