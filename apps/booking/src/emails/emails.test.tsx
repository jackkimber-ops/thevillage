import { describe, expect, it } from "vitest";
import { renderEmail } from "./render";
import type { EmailData } from "./types";

const settings = {
  name: "The Village - Family Club", address: "47/1 Quốc Hương, An Khánh, Hồ Chí Minh", openingHours: "Every day 8:30–17:00",
  contactEmail: "studio@example.com", contactPhone: "+84933834068", whatsappUrl: "https://wa.me/84933834068", zaloUrl: "https://zalo.me/0933834068",
  messengerUrl: null, facebookUrl: null, instagramUrl: null, mapsUrl: "https://maps.example", cancelCutoffTime: "20:00", bookingWindowDays: 31,
};

const base: EmailData = {
  kind: "booking_confirmation", lang: "en", firstName: "Lan", title: "Pilates Flow", sessionKind: "class",
  startsAt: "2030-11-02T02:00:00Z", endsAt: "2030-11-02T03:00:00Z", childNames: ["Bao"], parents: 1, credits: 1, packName: "10-class pack",
  unpaid: false, amountDueVnd: 0, freeTrial: false, cancelCutoff: "2030-11-01T13:00:00Z", oldStartsAt: null, reason: null,
  appUrl: "https://book.example", settings,
};

describe("customer emails", () => {
  it("confirmation: who, the pack credit and the free cancellation time (Saigon time)", async () => {
    const e = await renderEmail(base);
    expect(e.subject).toBe("You're booked: Pilates Flow, Saturday 2 Nov, 9:00");
    expect(e.text).toContain("You + Bao");
    expect(e.text).toContain("1 credit from your 10-class pack");
    expect(e.text).toContain("Free cancellation until 20:00 on Fri 1 Nov.");
    expect(e.html).toContain("https://book.example/bookings");
  });

  it("pay on the day shows the amount", async () => {
    const e = await renderEmail({ ...base, credits: 0, packName: null, unpaid: true, amountDueVnd: 450000 });
    expect(e.text).toContain("Pay on the day: 450,000 ₫");
  });

  it("after the cutoff it says it can't be cancelled online", async () => {
    const e = await renderEmail({ ...base, cancelCutoff: "2020-01-01T13:00:00Z" });
    expect(e.text).toContain("This booking can't be cancelled online.");
  });

  it("session moved shows the old and the new time", async () => {
    const e = await renderEmail({ ...base, kind: "session_moved", oldStartsAt: "2030-11-02T01:00:00Z" });
    expect(e.subject).toBe("Time change: Pilates Flow is now Saturday 2 Nov, 9:00");
    expect(e.text).toContain("It was Saturday 2 Nov, 8:00.");
  });

  it("session cancelled gives the reason and the credit back", async () => {
    const e = await renderEmail({ ...base, kind: "session_cancelled", reason: "flooding on our street" });
    expect(e.text).toContain("We're sorry: flooding on our street.");
    expect(e.text).toContain("Your credit is back in your 10-class pack.");
  });

  it("Vietnamese customers get the Vietnamese email", async () => {
    const e = await renderEmail({ ...base, lang: "vi", kind: "reminder" });
    expect(e.subject).toContain("Hẹn gặp ngày mai: Pilates Flow");
    expect(e.html).toContain('lang="vi"');
    expect(e.text).toContain("Bạn + Bao");
  });
});
