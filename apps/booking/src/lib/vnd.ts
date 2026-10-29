/**
 * An amount typed by staff, in VND: "450000", "450,000", "450.000", "450k", "1.5m", "1,5M", "4tr" (triệu).
 * Returns null for anything that isn't a positive whole amount (including "-20").
 */
export function parseVnd(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s|₫|vnd|đ/g, "");
  if (!s || s.includes("-")) return null;
  const m = /^(\d+(?:[.,]\d+)?)(k|m|tr|triệu|trieu)?$/.exec(s);
  if (m && m[2]) {
    const n = Number(m[1].replace(",", "."));
    const value = Math.round(n * (m[2] === "k" ? 1_000 : 1_000_000));
    return value > 0 ? value : null;
  }
  // No suffix: dots and commas are thousand separators.
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(s)) return null;
  const value = Number(s.replace(/[.,]/g, ""));
  return value > 0 ? value : null;
}
