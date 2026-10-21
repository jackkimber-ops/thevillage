# Open questions for the owners

As of 21 October 2026, after reading the requirements doc, the developer notes and the wireframe sketches.
Until you answer, the designs use clearly marked placeholders and the default shown under each question.

## A. Needed to keep 14 November (please answer this week)

1. **Design sign-off date** (the doc's only "Decide" row). 14 Nov is 24 days away, and coding can't start until you sign off the designs.
   **Suggestion: sign off by Tue 28 Oct.** The 53–85 hour estimate assumed reusing an existing app; a from-scratch build takes longer, so any slip here pushes the customer site to after the pilot (the doc's fallback).
2. **GitHub.** Which GitHub account or organisation should own the private repository (e.g. a new `thevillagesaigon` org), and who should be invited? I need access to it to push.
3. **Opening hours.** These also set when private hire can be booked.
4. **Pack prices and validity.** Class packs and open play packs of 10, 20, 40 and 60, how long each is valid, and how long the intro pack is valid.
5. **Staff accounts.** Names and emails of the 2 managers and the first instructors.
6. **Studio details.** Address, studio WhatsApp and Zalo numbers, Messenger link, Facebook and Instagram pages, and the address emails come from (e.g. `hello@thevillagesaigon.com`).

## B. Things in the docs that don't line up

The requirements win on *what* to build, so I'll follow the answer in **bold** unless you say otherwise.

| # | Where | The mismatch | What I'll do |
|---|---|---|---|
| 1 | Timeline (MVP plan) vs How we build | The 4-week plan starts coding in week 1 (20–26 Oct), but nothing is coded until designs are signed off | **Design first; re-plan the 4 weeks once you pick the sign-off date** |
| 2 | Open play: developer notes vs requirements | Notes say "up to 2 parents **per child** free"; requirements say one booking is **1 parent + up to 2 children**, and for open play "up to 2 parents free" | **An open play booking is up to 2 children (1 credit or 150,000 VND each) and up to 2 parents free.** Please confirm a second parent can come on open play but not on a class |
| 3 | Developer notes data model & staff sketch | Still have a `recurring_series` table and a "Recurring" menu, but on 21 Oct you dropped automatic weekly bookings | **Drop both.** Multi-date booking creates separate bookings |
| 4 | Customer wireframe sketches | Show Day/Week/Month switch, "free cancellation until 12 hours before", and a guest form without email | **Week list only, 20:00 the evening before, email required** (all decided 21 Oct) |
| 5 | C1 login | Asks for "a 6-digit code **or a one-tap login link**". On iPhone a link opens in Safari, not the home-screen icon, so the parent ends up logged in in the wrong place | **Email the code with the link underneath; the screen asks for the code.** OK? |
| 6 | Private hire | Mockup said up to 15 people; requirements don't give a maximum | **Group size is free text in the WhatsApp message.** Tell me if there's a limit |

## C. Gaps the docs don't cover (my suggested default)

1. **Moving a session with bookings on the staff calendar** (drag to move). Suggest: the bookings move with it and everyone booked gets an email; a move is blocked if it would overlap another session.
2. **Booking after the cutoff.** Someone booking at 21:00 for a 9:00 class tomorrow is already past the 20:00 cutoff. Suggest: allow it (latest booking is 1 hour before) and say on the confirm screen "This booking can't be cancelled online".
3. **Unpaid bookings for logged-in customers.** No limit is set. Suggest no limit at launch, as agreed, with all unpaid bookings in the manager's list.
4. **Free trial.** Suggest a class only, not open play, and it doesn't stop the customer buying the intro pack later.
5. **WhatsApp/Zalo login buttons before Meta/Zalo approve.** Suggest hiding them until approved, so opening day shows email login only.
6. **Instructor "Own sessions only / All customers" setting.** It belongs on the Staff page, which comes in the +2 weeks release. Suggest I set it for you at opening, like the staff accounts.
7. **Name punctuation.** "The Village - Family Club" or "The Village: Family Club"? (The sketches use "The Village · Family Club".)

## D. Owner tasks still open (from the requirements doc)

- [ ] First month's timetable: classes, days, times, instructor (in progress)
- [ ] Buy `thevillagesaigon.com`; check the matching Facebook and Instagram handles
- [ ] Who writes or checks the Vietnamese wording (not a launch blocker)
- [ ] Privacy policy (B1) and cancellation policy (B2) in English and Vietnamese, before the pilot
- [ ] Class illustrations (C28) and website photos (placeholders until then)
- [ ] Logo and colours (version 1 stays simple and pastel)
- [ ] Are the company registration papers ready for Meta and Zalo verification? Apply now
- [ ] Google Business Profile (W2): start as soon as the address is final
- [ ] Vote Yes / No / Not sure on the Ideas for later (not urgent)

## Already settled: no action needed

All 16 rows in *Mockup vs requirements* are ticked. The two follow-ups they raised are answered: the cutoff is 20:00 the evening before, and payment is by QR at check-in. All 13 business rules are agreed.
