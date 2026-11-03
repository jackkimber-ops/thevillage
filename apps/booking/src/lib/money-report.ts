import type { MoneyRow } from "@/lib/data/staff-types";
import { addDays, addMonths, weekStart } from "@/lib/time";

// M3 Money report: totals by payment method, by day, by week (Monday to Sunday) and for the month.

export type Totals = { qr: number; transfer: number; cash: number; total: number };
export const METHODS = ["qr", "transfer", "cash"] as const;
export const METHOD_LABEL: Record<MoneyRow["method"], string> = { qr: "QR", transfer: "Transfer", cash: "Cash" };
export const FOR_LABEL: Record<MoneyRow["paidFor"], string> = { pack: "Packs", drop_in: "Drop-ins", private_hire: "Private hire", workshop: "Workshops", other: "Other" };

const empty = (): Totals => ({ qr: 0, transfer: 0, cash: 0, total: 0 });
export function totals(rows: MoneyRow[]): Totals {
  return rows.reduce((t, r) => ({ ...t, [r.method]: t[r.method] + r.amountVnd, total: t.total + r.amountVnd }), empty());
}

/** "2026-11" from ?month=, or this month. */
export function monthOf(param: string | undefined, today: string): string {
  return param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : today.slice(0, 7);
}
export function monthRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  return { from, to: addDays(addMonths(from, 1), -1) };
}

/** The month's weeks (Monday to Sunday, cut to the month), each with its days that had payments. */
export function byWeek(rows: MoneyRow[], from: string, to: string) {
  const weeks: Array<{ from: string; to: string; days: Array<{ day: string; rows: MoneyRow[]; totals: Totals }>; totals: Totals }> = [];
  for (let monday = weekStart(from); monday <= to; monday = addDays(monday, 7)) {
    const wFrom = monday < from ? from : monday;
    const sunday = addDays(monday, 6);
    const wTo = sunday > to ? to : sunday;
    const inWeek = rows.filter((r) => r.day >= wFrom && r.day <= wTo);
    const days = [...new Set(inWeek.map((r) => r.day))].sort().map((day) => {
      const dayRows = inWeek.filter((r) => r.day === day);
      return { day, rows: dayRows, totals: totals(dayRows) };
    });
    weeks.push({ from: wFrom, to: wTo, days, totals: totals(inWeek) });
  }
  return weeks;
}

/** The month as a spreadsheet (CSV), one row per payment. */
export function toCsv(rows: MoneyRow[]): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const lines = [["Date", "Time", "Amount (VND)", "Method", "For", "What", "Customer", "Recorded by", "Note"].join(",")];
  for (const r of rows) {
    lines.push([r.day, time(r.recordedAt), r.amountVnd, METHOD_LABEL[r.method], FOR_LABEL[r.paidFor], r.what, r.customerName, r.recordedBy, r.note].map(cell).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
