import { describe, expect, it } from "vitest";
import { moveQuestion } from "./move-question";

const s = { title: "Core & Cuddle", startsAt: "2026-11-16T02:00:00Z", taken: 3, instructorId: "mai", instructorName: "Mai" };

describe("the question before moving a session (Jack, 4 Nov)", () => {
  it("says from when, to when, and who gets an email, and that emails wait 10 minutes", () => {
    expect(moveQuestion(s, "2026-11-16T03:00:00Z", "phuong")).toBe(
      "Move Core & Cuddle\nfrom Mon 16 Nov, 9:00\nto Mon 16 Nov, 10:00?\n\n" +
      "the 3 people booked and Mai (instructor) will get an email. Emails go out 10 minutes after the move, so if this is a slip, move it back and nobody is emailed.",
    );
  });
  it("leaves out the instructor when they move it themselves, and says when nobody is emailed", () => {
    expect(moveQuestion({ ...s, taken: 1 }, "2026-11-17T02:00:00Z", "mai")).toContain("the person booked will get an email");
    expect(moveQuestion({ ...s, taken: 0 }, "2026-11-17T02:00:00Z", "mai")).toContain("Nobody is booked, so no emails are sent.");
  });
});
