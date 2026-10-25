/** Turns what people type ("090 123 4567", "+84 90 123 4567", "84901234567") into +84… form, or null if it isn't a phone number. */
export function toE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let n: string;
  if (digits.startsWith("+")) n = digits;
  else if (digits.startsWith("00")) n = `+${digits.slice(2)}`;
  else if (digits.startsWith("84")) n = `+${digits}`;
  else if (digits.startsWith("0")) n = `+84${digits.slice(1)}`;
  else n = `+84${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
