# Open questions for the owners

> **Status 22 Oct:** sections A–C are all answered. Still waiting on: Caroline's login email, instructor names and emails, SVG logos (later), and the owner tasks in section D.

As of 21 October 2026, after reading the requirements doc, the developer notes and the wireframe sketches.
Until you answer, the designs use clearly marked placeholders and the default shown under each question.

## A. Needed to keep 14 November (please answer this week)

1. **Design sign-off date** (the doc's only "Decide" row). 14 Nov is 24 days away, and coding can't start until you sign off the designs.
   **Agreed 21 Oct: sign off by Tue 28 Oct.** The 53–85 hour estimate assumed reusing an existing app; a from-scratch build takes longer, so any slip here pushes the customer site to after the pilot (the doc's fallback).
2. **GitHub.** Repo is `jackkimber-ops/thevillage` (21 Oct). Claude has push access (21 Oct). Done.
3. **Opening hours.** Answered 21 Oct: **every day 8:30–17:00** (owners are changing Google Maps from 19:00 to 17:00). Private hire fits inside these hours.
4. **Pack prices and validity.** Decided 21 Oct: drop-in 450,000; 10 classes 4,000,000; 20 classes 7,200,000 (10% off); intro 3 for 750,000. Decided 21 Oct (2): 10-class pack valid **3 months**, 20-class pack **7 months**; open play stays **150,000 per child**, paid on the day. 40/60 packs and open play packs **undecided, not on sale at launch** (they can be added in the catalog later). Decided 21 Oct (3): intro pack valid **3 weeks**; **no promotion in the app** (opening weekend free class is handled at the door). Pricing is now complete for launch. Parked: the "arrive at 8:30, stay after class" free-play extra.
5. **Staff accounts.** Managers (21 Oct): **Phuong** and **Caroline**. Domain email is one shared inbox (hello@), so staff log in with **their personal emails**. Phuong logs in with ph.nguyen4787@gmail.com and **also teaches** (22 Oct). Still needed: Caroline's login email, and the instructors' names and emails (coming later).
6. **Studio details.** Studio contact email for now: **thevillage.saigon@gmail.com**, moving to **hello@thevillagesaigon.com** once the Namecheap inbox is set up ( automated emails will still send from the domain via Resend, with replies going to this address). Google Maps link received 21 Oct: https://maps.app.goo.gl/shhU5KCEVMMrX4cd8 (used for the website's "Find us on Google Maps" button). Address (21 Oct): **47/1 Quốc Hương, An Khánh, Hồ Chí Minh 700000**. Phone on Google: **+84 933 834 068**. WhatsApp and Zalo: use **+84 933 834 068** for now (owners, 21 Oct); it changes to a business number once the company is registered. Social (22 Oct): facebook.com/thevillage.saigon, instagram.com/thevillage.saigon, Messenger m.me/thevillage.saigon (check messaging is switched on in the page settings). Automated emails will come from an address on the domain once it's bought.

## B. Things in the docs that don't line up

The requirements win on *what* to build, so I'll follow the answer in **bold** unless you say otherwise.

| # | Where | The mismatch | What I'll do |
|---|---|---|---|
| 1 | Timeline (MVP plan) vs How we build | The 4-week plan starts coding in week 1 (20–26 Oct), but nothing is coded until designs are signed off | **Design first; re-plan the 4 weeks once you pick the sign-off date** | **Answered 22 Oct: agreed; re-plan after the 28 Oct sign-off.**
| 2 | Open play: developer notes vs requirements | Notes say "up to 2 parents **per child** free"; requirements say one booking is **1 parent + up to 2 children**, and for open play "up to 2 parents free" | **An open play booking is up to 2 children (1 credit or 150,000 VND each) and up to 2 parents free.** Please confirm a second parent can come on open play but not on a class | **Answered 21 Oct: yes, a second parent can come to open play (free).**
| 3 | Developer notes data model & staff sketch | Still have a `recurring_series` table and a "Recurring" menu, but on 21 Oct you dropped automatic weekly bookings | **Drop both.** Multi-date booking creates separate bookings | **Answered 22 Oct: agreed, dropped.**
| 4 | Customer wireframe sketches | Show Day/Week/Month switch, "free cancellation until 12 hours before", and a guest form without email | **Week list only, 20:00 the evening before, email required** (all decided 21 Oct) |
| 5 | C1 login | Asks for "a 6-digit code **or a one-tap login link**". On iPhone a link opens in Safari, not the home-screen icon, so the parent ends up logged in in the wrong place | **Email the code with the link underneath; the screen asks for the code.** OK? | **Answered 22 Oct: yes.**
| 6 | Private hire | Mockup said up to 15 people; requirements don't give a maximum | **Group size is free text in the WhatsApp message.** Tell me if there's a limit | **Answered 22 Oct: no limit.**

## C. Gaps the docs don't cover (my suggested default)

1. **Moving a session with bookings on the staff calendar** (drag to move). Suggest: the bookings move with it and everyone booked gets an email; a move is blocked if it would overlap another session. **Answered 21 Oct: yes, bookings move with the session and everyone booked gets an email.**
2. **Booking after the cutoff.** Someone booking at 21:00 for a 9:00 class tomorrow is already past the 20:00 cutoff. Suggest: allow it (latest booking is 1 hour before) and say on the confirm screen "This booking can't be cancelled online". **Answered 21 Oct: yes, allow it and show "This booking can't be cancelled online".**
3. **Unpaid bookings for logged-in customers.** No limit is set. Suggest no limit at launch, as agreed, with all unpaid bookings in the manager's list. **Answered 22 Oct: yes, no limit.**
4. **Free trial.** Suggest a class only, not open play, and it doesn't stop the customer buying the intro pack later. **Answered 22 Oct: yes.**
5. **WhatsApp/Zalo login buttons before Meta/Zalo approve.** Suggest hiding them until approved, so opening day shows email login only. **Answered 22 Oct: yes, hidden until approved.**
6. **Instructor "Own sessions only / All customers" setting.** It belongs on the Staff page, which comes in the +2 weeks release. Suggest I set it for you at opening, like the staff accounts. **Answered 22 Oct: yes.**
7. **Name punctuation.** "The Village - Family Club" or "The Village: Family Club"? (The sketches use "The Village · Family Club".) **Answered 22 Oct: "The Village - Family Club" (with a dash).**
8. **Selling a pack to someone with a pay-on-the-day booking.** Suggest: their upcoming unpaid bookings switch to credits from the new pack, so they don't pay twice. **Answered 22 Oct: yes.**

## C2. Brand (from the brand pack, 21 Oct)

1. Coral and forrest are slightly different in the brand guide and the logo files (coral `#E88D6D` vs `#F68665`). We use the guide's values. Which is the master? **Answered 22 Oct: use the brand guide's values.**
2. Please add SVGs of the full-colour wordmark and the badges. Only the one-colour wordmark SVGs are in the Drive folder. **Answered 22 Oct: later.**
3. The brand guide's sample paragraph is template filler ("Rimberio Coffee…"). Worth replacing before it's shared.
4. OK to use slightly deeper shades of forrest and coral for small text and buttons? The originals are too light to read at small sizes. **Answered 22 Oct: yes.**

## Changes after review

- **22 Oct: week and month views on the customer timetable** (owners). Reverses the 21 Oct "week list only" decision (Mockup row 9 / C2). List stays the default; Week and Month added. Adds a few hours to the build; re-estimated at sign-off.

## Ideas noted for later

- **Holiday freeze (owners, 21 Oct):** many expat families are away at Christmas and in summer, so members will want to freeze their pack. Pausing one customer's pack (M2) is already in the +2 weeks release; a studio-wide or self-service freeze can come after. Not needed now.

## D. Owner tasks still open (from the requirements doc)

- [ ] First month's timetable: classes, days, times, instructor (in progress)
- [ ] Buy `thevillagesaigon.com`; check the matching Facebook and Instagram handles
- [ ] Who writes or checks the Vietnamese wording (not a launch blocker)
- [ ] Privacy policy (B1) and cancellation policy (B2) in English and Vietnamese, before the pilot
- [ ] Class illustrations (C28) and website photos (placeholders until then)
- [ ] Logo and colours (version 1 stays simple and pastel)
- [ ] Register the business. Meta (WhatsApp) and Zalo verification need the registration papers, so **WhatsApp/Zalo login codes (C30) wait until then; email codes cover opening day.** Not registered yet (21 Oct)
- [ ] Google Business Profile (W2): start as soon as the address is final
- [ ] Vote Yes / No / Not sure on the Ideas for later (not urgent)

## Already settled: no action needed

All 16 rows in *Mockup vs requirements* are ticked. The two follow-ups they raised are answered: the cutoff is 20:00 the evening before, and payment is by QR at check-in. All 13 business rules are agreed.
