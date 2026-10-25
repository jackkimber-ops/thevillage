/** VND as whole numbers: "450,000 ₫" in English, "450.000 ₫" in Vietnamese. */
export function formatVnd(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 0 }).format(amount)} ₫`;
}
