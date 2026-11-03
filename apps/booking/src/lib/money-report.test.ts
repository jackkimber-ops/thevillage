import { describe, expect, it } from "vitest";
import type { MoneyRow } from "@/lib/data/staff-types";
import { byWeek, monthOf, monthRange, toCsv, totals } from "./money-report";

const row = (day: string, amountVnd: number, method: MoneyRow["method"], extra: Partial<MoneyRow> = {}): MoneyRow => ({
  id: `${day}${amountVnd}${method}`, day, recordedAt: `${day}T03:00:00Z`, amountVnd, method, paidFor: "drop_in",
  customerName: "Lan", recordedBy: "Caroline", note: null, what: null, ...extra,
});

describe("money report", () => {
  it("adds up by method, day and Monday-to-Sunday week, cut to the month", () => {
    const rows = [row("2026-11-01", 450000, "cash"), row("2026-11-02", 4000000, "qr"), row("2026-11-02", 150000, "cash"), row("2026-11-09", 300000, "transfer")];
    expect(totals(rows)).toEqual({ qr: 4000000, transfer: 300000, cash: 600000, total: 4900000 });
    const { from, to } = monthRange("2026-11");
    expect([from, to]).toEqual(["2026-11-01", "2026-11-30"]);
    const weeks = byWeek(rows, from, to);
    // 1 Nov is a Sunday: the first "week" is just that day.
    expect(weeks[0]).toMatchObject({ from: "2026-11-01", to: "2026-11-01", totals: { total: 450000 } });
    expect(weeks[1].days.map((d) => [d.day, d.totals.total])).toEqual([["2026-11-02", 4150000]]);
    expect(weeks.at(-1)).toMatchObject({ from: "2026-11-30", to: "2026-11-30" });
  });

  it("reads the month from the address, or uses this month", () => {
    expect(monthOf("2026-12", "2026-11-03")).toBe("2026-12");
    expect(monthOf("2026-13", "2026-11-03")).toBe("2026-11");
    expect(monthOf(undefined, "2026-11-03")).toBe("2026-11");
  });

  it("writes a spreadsheet, quoting commas", () => {
    const csv = toCsv([row("2026-11-02", 4000000, "qr", { paidFor: "pack", what: "10-class pack", note: "paid, thanks" })]);
    expect(csv.split("\r\n")[1]).toBe('2026-11-02,10:00,4000000,QR,Packs,10-class pack,Lan,Caroline,"paid, thanks"');
  });
});
