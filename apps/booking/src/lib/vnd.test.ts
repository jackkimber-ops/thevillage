import { describe, expect, it } from "vitest";
import { parseVnd } from "./vnd";

describe("parseVnd", () => {
  it("reads amounts the way staff type them", () => {
    expect(parseVnd("450000")).toBe(450000);
    expect(parseVnd("450,000")).toBe(450000);
    expect(parseVnd("450.000")).toBe(450000);
    expect(parseVnd("450k")).toBe(450000);
    expect(parseVnd("450K")).toBe(450000);
    expect(parseVnd("1.5m")).toBe(1500000);
    expect(parseVnd("1,5M")).toBe(1500000);
    expect(parseVnd("4tr")).toBe(4000000);
    expect(parseVnd("500 000 ₫")).toBe(500000);
  });
  it("refuses negative, empty and unclear amounts", () => {
    for (const bad of ["-20", "", "0", "abc", "4.5", "12,34", "1k5"]) expect(parseVnd(bad), bad).toBeNull();
  });
});
