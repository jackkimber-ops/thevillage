import { describe, expect, it } from "vitest";
import { markTest } from "./test-email";

const mail = { from: "The Village <bookings@thevillagesaigon.com>", to: "hello@x", subject: "New booking: Loki", html: "<html><body style=\"x\"><p>Hi</p></body></html>", text: "Hi" };

describe("emails from the test site are marked (18 Nov)", () => {
  it("live emails are untouched", () => {
    expect(markTest(mail, "production")).toEqual(mail);
  });
  it("staging, previews and laptops: [TEST] subject, a banner first in the body, a line in the text", () => {
    for (const env of ["preview", "development", undefined]) {
      const m = markTest(mail, env);
      expect(m.subject).toBe("[TEST] New booking: Loki");
      expect(m.html).toMatch(/^<html><body style="x"><div[^>]*>TEST SITE: not a real booking/);
      expect(m.html).toContain("<p>Hi</p>");
      expect(m.text).toMatch(/^\*\*\* TEST SITE: not a real booking.*\*\*\*\n\nHi$/);
      expect(m.to).toBe("hello@x");
      expect(m.from).toBe("The Village (TEST) <bookings@thevillagesaigon.com>");
    }
  });
  it("never doubles the mark", () => {
    const twice = markTest(markTest(mail, "preview"), "preview");
    expect(twice.subject).toBe("[TEST] New booking: Loki");
    expect(twice.from).toBe("The Village (TEST) <bookings@thevillagesaigon.com>");
    expect(twice.html!.match(/TEST SITE/g)).toHaveLength(1);
  });
});
