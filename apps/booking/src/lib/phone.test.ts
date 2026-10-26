import { describe, expect, it } from "vitest";
import { isEmail, toE164 } from "./phone";
import { safeNext } from "./safe-next";

describe("phone numbers", () => {
  it("stores Vietnamese mobiles in +84 form", () => {
    expect(toE164("090 123 4567")).toBe("+84901234567");
    expect(toE164("+84 90 123 4567")).toBe("+84901234567");
    expect(toE164("84901234567")).toBe("+84901234567");
    expect(toE164("+44 7700 900123")).toBe("+447700900123");
    expect(toE164("123")).toBeNull();
  });
  it("checks emails", () => {
    expect(isEmail("lan@example.com")).toBe(true);
    expect(isEmail("lan@")).toBe(false);
  });
  it("only redirects within the site", () => {
    expect(safeNext("/bookings")).toBe("/bookings");
    expect(safeNext("//evil.com")).toBe("/classes");
    expect(safeNext("https://evil.com")).toBe("/classes");
  });
});
