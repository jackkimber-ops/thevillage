# Build plan

Designs signed off 25 Oct 2026. Opening day **14 Nov 2026**; second release about **14 Dec 2026** (+1 month).
Each stage is a pull request with a preview link. The owners approve before it is merged.

Times are Claude's build-and-test time, assuming owner replies within an hour or two during the day. Target: stages 3–9 done around **4–6 Nov**, leaving a week to load the real timetable, train staff and fix what testing finds.

| # | Stage | What's in it | Build time | Owner check | Status |
|---|---|---|---|---|---|
| 1 | Design sign-off | Designs frozen; later changes via `docs/change-list.md` | — | — | **Done 25 Oct** |
| 2 | Accounts and services | Domain + Namecheap mailbox, Vercel Pro, Supabase (staging + production, Singapore), Resend, GitHub settings; later free: Turnstile, Sentry, uptime monitor | owners: ~1 h; Claude: setup ~1–2 h | Buy, then invite Claude | Waiting on owners (repo stays under jackkimber-ops) |
| 3 | Foundations | Next.js app, `book.` and `staff.` hostnames, staging/production, CI tests on every PR, EN/VI set-up, health route | 1–2 h | Quick look at preview | Built 25 Oct (branch `build/stage-3-foundations`); PR once Vercel is connected |
| 4 | Database and core rules | Tables, RLS on every table, safe-booking function, credit ledger, pg_cron attendance, studio settings, catalog and prices as seed data, Vietnam time, overlap rule; automated tests | 4–6 h | Short summary to approve | Built 25 Oct (branch `build/stage-4-database`): 52 tests pass. Plan in `docs/database.md` |
| 5 | Login and guest booking | Email code login (Resend), first-login "your details", guest booking, Turnstile | 2–4 h | Try on your phone | Screens built 25 Oct (branch `build/stage-5-6-customer-site`); needs Supabase + Resend to go live, Turnstile keys to add |
| 6 | Customer booking site | Home, timetable (List/Week/Month), session, confirm (class and open play), booked, my bookings, cancel, packages, menu, hire the studio | 5–8 h | Tap through on your phone | Built 25 Oct (same branch): 18 browser tests on demo data |
| 7 | Staff app | Dashboard and get-in-touch list, calendar with drag to move, session editor, customers and profile, sell pack and record payment, catalog, instructor phone screens (today, check-in, book someone in, new customer) | 6–10 h | Try the main tasks | |
| 8 | Emails and calendar | Confirmation, 18:00 reminder, session moved, calendar feeds (.ics) | 2–3 h | Check the emails you get | |
| 9 | Website | One-page `thevillagesaigon.com` | 1–2 h | Look it over | |
| 10 | Testing and go-live | Owner testing on staging, fixes, real timetable, staff accounts, policy and Vietnamese wording, go-live checklist, switch to production | 1–2 days | Real-world testing | |
| 11 | Opening day | Live 14 Nov; fixes in the first days | — | — | |
| 12 | Second release (+1 month) | Pick dates, pausing packs, delete my data, reports (with attendance), staff page, studio settings page | to plan | — | |

After that (needs business registration): WhatsApp/Zalo login and messages, SMS, push notifications, waitlist.

## Needed from the owners before launch (by about 10 Nov)
- First month's timetable (classes, days, times, instructor)
- Caroline's login email; instructor names and emails
- Privacy policy and cancellation terms (EN and VI); someone to check the Vietnamese wording
- Studio photo for the login and home screens (otherwise a plain colour, no placeholder tags)

## Fallback
If the schedule slips badly: open with the staff app on 14 Nov and the customer site a few days later. Claude will flag this early.
