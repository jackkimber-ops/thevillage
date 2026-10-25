import { describe, expect, it } from "vitest";
import { addMonths, formatTime, formatWeekRange, vnDateKey, vnDayStart, weekStart } from "./time";
import { formatVnd } from "./money";

describe("studio time (Saigon)", () => {
  it("uses the Saigon date, not UTC", () => {
    expect(vnDateKey("2026-11-13T17:30:00Z")).toBe("2026-11-14");
    expect(vnDateKey("2026-11-13T16:59:00Z")).toBe("2026-11-13");
    expect(vnDayStart("2026-11-14").toISOString()).toBe("2026-11-13T17:00:00.000Z");
  });

  it("starts weeks on Monday", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
  });

  it("formats times and week ranges", () => {
    expect(formatTime("2026-11-02T02:00:00Z", "en")).toBe("9:00");
    expect(formatTime("2026-11-02T08:30:00Z", "en")).toBe("15:30");
    expect(formatWeekRange("2026-11-02", "en")).toBe("2 – 8 November");
    expect(formatWeekRange("2026-11-30", "en")).toBe("30 Nov – 6 Dec");
    expect(addMonths("2026-11-14", 1)).toBe("2026-12-01");
  });

  it("formats VND without decimals", () => {
    expect(formatVnd(450000, "en")).toBe("450,000 ₫");
    expect(formatVnd(150000, "vi")).toBe("150.000 ₫");
  });
});
