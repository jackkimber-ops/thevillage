# Change list (after design sign-off, 25 Oct 2026)

Designs were signed off on 25 Oct 2026 (canvas version 70). Any change to what was signed off goes here first, with its effect on time, and is agreed before it's built.

| # | Date asked | Change | Who asked | Effect on time | Agreed? | Built in |
|---|---|---|---|---|---|---|
| 1 | 25 Oct | **Timetable List view shows the next 7 days from today** (e.g. "25 – 31 October") instead of Monday–Sunday, so late in the week it isn't nearly empty. Week grid stays Monday–Sunday | Claude (found in testing) | None | **Agreed 27 Oct** (Jack), then **replaced by #4** the same day | Stages 5–6 (merged 26 Oct) |
| 2 | 25 Oct | **Hire the studio, "Send on Zalo":** Zalo links can't carry pre-written text, so the button copies the details and opens Zalo for the customer to paste (WhatsApp is pre-filled as designed) | Claude (technical limit) | None | **Agreed 27 Oct** (Jack) | Stages 5–6 (merged 26 Oct) |
| 3 | 27 Oct | **"✓ Booked" instead of "Book" for sessions you're already booked into** (logged-in customers): on the timetable List, Month day list and home page as a light cream pill with dark olive text, linking to that booking in My bookings; a ✓ and outline on the Week grid block; on the session page "You're booked into this session." and "See my booking" instead of the Book button. Guests who booked without logging in still see "Book". Vietnamese wording is a draft | Jack (testing on staging) | About 1 hour | **Agreed 27 Oct** (Jack) | `change/3-booked-state`, PR #12 |
| 4 | 27 Oct | **Timetable List view shows one calendar week, Monday to Sunday** (replaces #1), with a **"See next week"** button at the bottom; the arrows at the top still step a week at a time. Sessions already over are left out, so the current week starts from today | Jack (testing on staging: a list starting on Tuesday felt odd) | About 30 minutes | **Agreed 27 Oct** (Jack) | `change/4-list-calendar-week` |
