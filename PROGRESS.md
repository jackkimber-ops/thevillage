# Progress

## Done
- 21 Oct: read the requirements doc, developer notes and the wireframe sketches.
- 21 Oct: listed what's still open → `docs/open-questions.md`.
- 21 Oct: set up the project folder with `CLAUDE.md`, the owner checklist (`docs/owner-checklist.md`) and the brief PDFs.
- 21 Oct: owners agreed: design sign-off by **Tue 28 Oct**; repo is `github.com/jackkimber-ops/thevillage`; details (hours, prices, staff, studio info) to come in a few days; owners starting domain and Meta/Zalo verification.
- 21 Oct: **wireframes v1**, 29 screens: 14 customer phone screens, 10 staff computer pages, 4 instructor phone screens and the one-page website. Preview: https://claude.ai/artifact/Lc55EEnJbQhBEtzfheUhCF (source in `design/wireframes/project/`).
- 21 Oct: first push to GitHub (`jackkimber-ops/thevillage`, branch `main`).
- 21 Oct: brand pack received from Google Drive. Logos, brand guide and colour/type notes are in `design/brand/` (see its README).
- 21 Oct: **visual style v1**: a style sheet plus 5 key screens in the brand (login, timetable, confirm a class, staff dashboard, website top), as a new row at the bottom of the preview canvas.
- 21 Oct: owners approved the visual style ("design looks good"). **Designs v2:** brand style applied to all 29 screens.

## Update (10 Nov): get-in-touch fail-safe

All merged to `main` and live; staging matches `main`. The full staging check passes (71 of 71).

- **Get-in-touch list shows the date** (#63, change #38): "Core & Cuddle · Mon 16 Nov, 9:00" instead of "Mon 9:00".
- **Studio alert emails checked:** Dakota's new-booking alert to hello@thevillagesaigon.com was delivered (Resend), and so was her confirmation email.
- **Dakota vanished from the list:** the database showed she had been marked Contacted from Jack's login at 6:39 on 10 Nov (an accidental tap). Cleared on production at Jack's request, with an `audit_log` row (`undo_contacted`); she's back on the list.
- **Get-in-touch fail-safe** (#64, change #39, migration `20261110000001_contact_log`):
  - Each person has **How** (WhatsApp / Zalo / Call / In person, starting on their preferred way), **No answer**, and a **Not contacted** button (light fill, dark green border).
  - Tapping it turns it dark green, **Contacted ✓**, in place, with "✓ Contacted on WhatsApp by Phuong, 9:12". The row stays until midnight (Vietnam time); tapping Contacted ✓ again undoes it.
  - No answer keeps them waiting: "No answer ×2 · last tried by phone by Phuong, 9:12".
  - Header: "2 to contact · 1 contacted today".
  - Every contact, no-answer and undo is logged (`contact_log`: who, how, when) and shown on the customer's page under "getting in touch".
  - Contacting twice is refused (`already_contacted`), so two staff can't both mark the same person.
  - Contacts from before 10 Nov have no who/how record.
  - The old `mark_contacted` function is still in the database, unused; it can be dropped later.
- **Staging check:** the "edit a session" step waits for the page to load before typing (a Save tapped too early was a plain reload). The clean-up script also removes test `contact_log` rows.
- **Pre-launch to-do message** drafted for the team: policy and terms wording, instructor names and emails, hello@ on everyone's phones, WhatsApp/Zalo on the new number, December timetable, home-screen apps (staff, instructors, customers), Vietnamese read-through, photos, a last test run, the pinned password, closure days.

## Update (4–9 Nov): schedule agreed, staff app on phones, places, business number

All merged to `main` and live; staging matches `main`. The full staging check passes (71 of 71).

- **Moving a session** (#57, change #32, migration `20261104000002_move_emails_once`):
  - The drag question says from when, to when, and who gets an email.
  - "Session moved" emails wait 10 minutes. A second move in that time sends one email from the original time; moving it back sends nothing.
  - The instructor is emailed when someone else moves their session.
- **Agreed November schedule** (#58, change #33; data `supabase/data/20261107-november-schedule.sql`):
  - 16–30 Nov only.
  - Mon–Fri & Sun: a class 9:00–10:00, then Open Play 10:00–12:00.
  - Saturday: Open Play 8:30–10:30, then Core & Cuddle 10:30–11:30.
  - Everything from 1 December removed; no bookings were on changed or removed sessions.
  - Opening hours "Mon–Fri & Sun 9:00–12:00, Sat 8:30–11:30".
  - The children's classes from the 3 Nov draft aren't agreed and aren't loaded.
- **Staff app on the home screen** (#59, change #34):
  - "Village Staff", with the house badge on dark olive (`/staff/manifest.webmanifest`, `app/staff/apple-icon.png`).
  - It opens the staff app, never the customer site.
  - A "Keep the staff app on your phone" card on the dashboard and My sessions.
- **Business number** (#60, change #35):
  - Contact phone +84 906 446 214 (staging and production settings).
  - WhatsApp and Zalo buttons stay on +84 933 834 068 until set up on the new number.
  - Decided: no Meta/Zalo business verification; email is the only automated channel.
- **Timetable opens on the first week with sessions** (#61, change #36): until opening that's 16–22 Nov, so no empty weeks to click through; from then on, the current week.
- **Places left only when few are left** (#62, change #37, migration `20261109000001_places_hint`):
  - Classes: "Only 3 places left" / "Last place!".
  - Open Play: "Almost full", with no number.
  - Then "Full".
  - Above the cut-off the count isn't sent to the customer site. The cut-off (3) is in Settings; staff keep exact counts.
- **Staging check:** waiting move emails don't count as stuck. Late-evening runs keep "QA Today" clear of the "very soon" session. Three customer tests look a week ahead (weekends had no bookable class left).

## Update (4 Nov): team retest fixes

All merged to `main` and live; staging matches `main`.

- **Team feedback** (#56, change #31):
  - **Test sites link to each other:** the test website's Book buttons went to the live booking site, and the test booking app's website link to the live website. Fixed with Vercel settings for the `staging` branch only (`NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_WEBSITE_URL`). The "Add to Google Calendar" event text now uses each site's own address.
  - **No future birth months:** every month picker stops at this month, and a database trigger refuses a future month from any form.
  - **Cancellation terms link** next to the privacy policy in the guest form's small print. The terms page waits for the owners' wording.
  - **Safeguard:** a session with bookings can only be cancelled through Cancel session, which cancels the bookings and emails everyone. The 3 Nov timetable reloads on staging had marked sessions cancelled directly, leaving Rob's test bookings in My bookings; those are tidied.
  - Migration `20261104000001_feedback_safeguards`, on staging and production.
  - **WhatsApp number:** managers change it in Settings when the business number exists.
  - A reply to Rob is drafted.
- **For future timetable changes:** sessions with bookings must be cancelled with `cancel_session`, never by setting their status. The old data scripts carry a note.

## Update (3 Nov, evening): second-release features brought forward

All merged to `main` and live; staging matches `main`. The full staging check passes (71 of 71).

- **Home screen icon (C9, opening-day requirement that had been missed)** (#43):
  - The booking site can be saved to a phone's home screen, with an app manifest and the house badge on sage as the icon, named "The Village".
  - "Keep the village on your phone" appears on "you're booked" and in the menu: Android adds it in one tap, iPhone gets the Safari steps.
- **Brought forward from the +1 month release** (#44–#48, change list #22–#26). Migrations `20261103000002`–`000005` are applied to staging and production.
  - **Staff page** (S2, `/staff/team`): managers add staff by name and email (a login is made if needed), change role and instructor access, and switch access off. Rules in the database: managers only, never yourself, always one manager.
  - **Settings** (M9): studio details, opening hours EN/VI, contact email and phone, where alerts go, messaging and social links, and the booking rules (cancellation time, how far ahead, how late, largest hire group). Every value is checked and every change is audited. The booking site applies changes at once, the website within the hour.
  - **Money report** (M3, Reports): a month at a time, by QR, transfer and cash, day by day with weekly and monthly totals, every payment listed, and a spreadsheet download (`/staff/reports/export`).
  - **Closures** (M1, in Settings): close the studio for given days. Those sessions are cancelled for everyone (credits back, emails sent), packs are extended by the closed days, a trigger refuses sessions on closed days, and the timetable shows "The studio is closed…". **Test only on staging**: on live it cancels real sessions and emails real customers.
  - **Calendar subscription** (C11/S8): "Add to my calendar" on My bookings, My sessions and the staff dashboard, for Apple Calendar, Google Calendar or a copied link, plus "make a new link".
  - The "+1 month" placeholders are gone from the staff menu.
- **Fixes after checking against the team's earlier feedback** (#49):
  - On phones, managers get a **More** tab for Catalog, Reports, Staff and Settings, which before were only in the computer side menu.
  - The add-staff and closure forms empty after a successful save.
- **Staying logged in** (#50, Jack on Android):
  - The login itself lasted: the cookie is kept 400 days and the hourly token renews by itself.
  - But the home page always showed "Log in", so the reopened app looked logged out. It now shows "My bookings" to logged-in people, and `/login` skips ahead if you're already logged in.
  - Jack confirmed it works.
- **Add to calendar opens the calendar, no file download** (#52, Jack):
  - Each booking offers **Add to Google Calendar**, with the class, time and address filled in; one tap to save.
  - On Apple devices it also offers **Add to Apple Calendar**, which opens Apple's "Add to Calendar" sheet. The .ics is now sent inline, not as an attachment.
  - The customers' "add all my bookings" subscription is **Apple only**, on Apple devices, as one button. Google subscriptions refresh every few hours and often can't be added on a phone.
  - The staff card keeps all its options.
- **Final schedule from 16 Nov** (#54, change #30; data `supabase/data/20261103-final-timetable.sql`, on staging and production). It replaces the 2 Nov timetable below.
  - Every day: a class 9:00–10:00 and Open Play 10:00–12:00. No afternoon Open Play.
  - 210 sessions to 28 Feb. Phuong teaches Core & Cuddle.
  - Opening hours: "Every day 9:00–12:00; Tue & Thu also 15:30–16:30 (from December)", in EN and VI.
- **Children's classes not loaded yet:** Yoga Storytelling (3–5, Tue) and Yoga Adventure (6–10, Thu), 15:30–16:30 from December, 10 places, children only.
  - Waiting on the owners: the price per child, whether packs can be used, and two badges.
  - Then Claude builds booking a child without a parent (about half a day), aiming for about 10 Nov.
- **Team message drafted** for the retest, with the test-site links (booking site, staff app, website).
- **Still left in the +1 month release:**
  - pick several dates at once (C25)
  - pause a pack (M2)
  - instructor report (M4, before the first pay day)
  - delete or anonymise a customer (M10)
  - one-off workshops (M7)
- **Team message drafted** for the retest. It asks for a check of the Vietnamese on the new parts and for real-phone tests of the home-screen icon and calendar links.

## Update (3 Nov): timetable and class details live

All merged to `main` and live; staging matches `main`.

- **Timetable from Monday 16 Nov** (#37, change #18; data `supabase/data/20261102-timetable-from-16nov.sql`, loaded on staging, then production):
  - Every day: a class 8:30–9:30, then Open Play 9:30–11:30; Mon–Sat also Open Play 13:00–15:00.
  - Classes: Core & Cuddle (Mon, Fri, Sat), Little Yogi & Me (Tue; was "Mum & Bub Yoga"), Breathe & Unwind (Wed, new), Bump & Breathe (Thu, new), Wiggle & Wonder (Sun).
  - 300 sessions up to 28 Feb 2027, capacity 10. The 27 Oct sample sessions are gone (none had bookings on production).
  - Opening hours are now "Mon–Sat 8:30–15:00, Sun 8:30–11:30" (Vietnamese too) on the website, booking site and emails.
  - The website's Classes card lists the five classes.
- **Class details** (#38, change #19; migration `20261103000001_class_taglines`, data `supabase/data/20261103-class-details-and-badges.sql`):
  - **Badges:** every class has its own, from the Instagram set. The new ones are recoloured from the existing badges so they stay sharp: Breathe & Unwind (cream, sage triangle), Bump & Breathe (peach, cream circle), Strong & Snuggly (cream, peach arch).
  - **Text:** the owners' descriptions and taglines, in English and Vietnamese, for all six classes. The tagline shows under the class name on its page. Staff edit the English text in the catalog; Vietnamese changes go through Claude.
  - **Strong & Snuggly:** new class type, covered by every class pack. Not on the timetable yet.
  - **Phuong** teaches every Core & Cuddle session.
- **Staging check:** its test sessions moved to the evenings. From 16 Nov it only runs **after 15:00 or before 8:00 Vietnam time**: some of its sessions must start within the hour, which would overlap a class during studio hours. 71 of 71 pass.
- **Open Play text:** tagline "Little Adventures" / "Những cuộc phiêu lưu nhỏ" and the owners' description, in English and Vietnamese (data `supabase/data/20261103-open-play-details.sql`). Every class and Open Play now has its tagline and description in both languages.
- **Week view easier to read** (#40, change #20):
  - Hours with sessions are taller, so a 1-hour class shows its start time and its full name on up to 3 lines.
  - No tiny badge inside the blocks.
  - Empty hours (the lunch gap) shrink to a thin strip.
  - Tighter spacing on phones.
- **Sentry issue 157146842 fixed** (#41), the same error on 29 Oct and 3 Nov:
  - **Cause:** the app sometimes couldn't open a connection to Supabase within 10 s (`ConnectTimeoutError`), and the page crashed. A network blip between Vercel and Supabase, not a bug in the page; the 3 Nov one came 40 s after a fresh deploy.
  - **Retry:** the Supabase clients (pages, admin, proxy) now try once more when the connection never opened. Safe for every request, bookings included, since nothing reached the database. Requests that may have arrived are never retried.
  - **Error page:** if a page still can't load, customers see "sorry, that didn't load" with Try again (EN/VI) instead of a crash.
  - **If it keeps happening:** a Sentry report even with the retry would mean a Supabase support ticket.

## Update (29 Oct – 2 Nov): team feedback rounds

All merged and live.

- **#34 (change #15, 29 Oct):**
  - staff app: amounts like "450k"; private hire agreed price and balance; Here / No-show only on the day; credits in search and when booking someone in
  - customer site: **Edit my details** in the menu (brought forward); Back and the Classes tab return to where you were
  - website: phone header layout
- **#35 (change #16, 30 Oct):**
  - website: EN button works after visiting Vietnamese; Book links keep the language; Message us / Follow us as icons
  - booking site: website link and icons in the menu; 6 upcoming classes; week view trimmed to the hours used; the login page shows the class you're booking
- **#36 (change #17, 2 Nov, final sweep):**
  - Back returns to the page you came from
  - forms keep what you typed through the menu or privacy policy
  - Remove a child
  - the All / Classes / Open play filter and the day you're on stay when changing view
  - **Hire the studio:** from an hour to a full day, case by case, written in the customer's own words; up to 15 people (`studio_settings.hire_max_group`); staff can enter sessions up to 10 hours
  - Vietnamese opening hours (`studio_settings.opening_hours_vi`)
- **Sentry alert (29 Oct, 20:56 Vietnam time, production):** a database connection timeout, fixed on 3 Nov (#41, see above).

## Update (28 Oct)

- **Studio alert emails now go to hello@thevillagesaigon.com** on staging and production (`studio_settings.alert_email`). A test email to hello@ was delivered. The customer-facing contact email stays thevillage.saigon@gmail.com until the owners say to switch.
- **Change #14, one-class drop-ins** (#31, wording fixed in #32): the customer page says there's no pack to sell for one class and to use **Book in** (pay on the day, 450,000 ₫ from the catalog). Managers can **Record** a payment next to an upcoming pay-on-the-day booking, for someone who pays by transfer before the day.
- **Staging check** (#29, #30):
  - test logins that collide between the phone and computer runs retry once
  - while it runs, studio alerts go to Resend's test inbox
  - afterwards the address in use before is put back (hello@)
  - 71 of 71 checks pass on the current code
- **Team retest:** staging is clean. Message drafted for Jack to send to Phuong, Caroline and Rob (fixes from their feedback, plus new features to try).
- **Company mailbox on phones:** Namecheap Private Email works in iPhone Mail, Gmail or Outlook (IMAP `mail.privateemail.com` 993 SSL, SMTP 465 SSL), or webmail at privateemail.com. It's one shared login, so share the password privately.
- **Flaky CI test fixed** (#32): "Back returns to the week" read the week label before the next week had loaded, so on GitHub's slower runners it sometimes failed (seen on #30 and #32). It now waits. CI also reports browser test failures as GitHub annotations, which can be read through the API: CI logs themselves can't be opened from this session.

## Update (27 Oct, evening): first team test, full check, missing features

All merged to `main` and live; staging matches `main`.

- **Team test on staging** (Phuong, Caroline, Rob). Staff now on staging **and** production as managers: Phuong, Caroline, **Rob** (vanalphenrob@gmail.com), **Jack** (jack.kimber@gmail.com). Test logins on staging only: `delivered+qa-manager@resend.dev`, `delivered+qa-instructor@resend.dev`.
- **First fixes** (#24): clearer "Book someone in", iPhone dragging, "My bookings/packs" filtered to the customer (staff who also book saw everyone's). Vercel Toolbar switched off on the booking project.
- **Full check on staging** (#25): a repeatable check, `apps/booking/e2e-staging` (`npm run check:staging`, see its README; keys from the environment, never the repo), 71 checks against the real staging site, database, emails and jobs, phone and computer. It found and fixed:
  - forms that wiped what was typed on any error
  - guests not linked to their bookings when they later log in
  - staff one-tap login link going to the customer page
  - local phone format (0772…) not found in search
  - instructors adding a customer landing on "page not found"
  - "Book someone in" dropping staff on the dashboard
  - "Book" shown less than 1 hour before a session (now "Closed", change #10)
  - Intro pack pre-selected when selling (change #11)
  - "0/null children" on the staff calendar
- **Missing opening-day requirements built** (#26, change #12): cancellation email (C8); welcome email for customers added by staff and staff editing customers, plus managers deactivating them (S22); children on profiles (S21); studio alert email for a new customer's first booking or an unpaid drop-in (S25), sent to `studio_settings.alert_email` (empty in production, so it goes to the contact email; set to Resend's test inbox on staging); private hire payments (S14).
- **Team feedback** (#27, change #13):
  - dragged sessions stay visible
  - a child must have a birth month
  - full customer list with credits left, plus total credits and extension history on profiles
  - check-in shows "Cancel booking" before the cutoff
  - no past sessions
  - Back keeps the week
- **"Group class" type switched off** on staging and production (`supabase/data/20261027-group-class-off.sql`).
- **Migrations applied to staging and production:**
  - `20261027000002` (local phone search)
  - `…03` (link guest at login)
  - `…04` (instructors see customers they add)
  - `…05` (opening-day gaps)
  - `…06` (customer list)
- **Staging-only Vercel variable** `QA_BYPASS_TOKEN` (branch `staging`) lets the check past BotID; never in production.
- **Running the check:** it creates "QA …" data on staging and removes it before and after each run. Warn testers, or run it when they aren't testing (a "QA" session deleted while open shows "page not found").
- **Security note for the owners:** the WhatsApp group's pinned message shows the Gmail/Instagram password.

## Handover (27 Oct, end of day): start here in a new session

**Where things stand:** everything below is merged to `main` and live (production serves `main`). The build is ahead of the plan; what's left is owner content, the minimum sign-ups feature, and final go-live checks. Opening day is **14 Nov**; the first sessions are on **16 Nov**.

**Done 27 Oct:**
- **Changes #1–#8 agreed** (see `docs/change-list.md`) and built: #3 "✓ Booked" instead of Book (jackkimber-ops/thevillage#12); #4 List view Monday–Sunday with "See next week" (#13); #5 a badge per class type, one session type per class (#14); #6 "Coming up" shows the next 3 bookable sessions in the booking window (#15); #7 map picture on the home page and website (#16), then #7b a closer Thảo Điền crop (#21) and finally **#7c Jack's zoomed-out Google Maps view** (#22: The Village centred, river both sides, Xuân Thủy, Ga Thảo Điền, Cầu Sài Gòn, MM Mega Market; image `brand/map-the-village.jpg` in both apps, 741×372, "Map data © Google" credit, opens Google Maps). An illustrated map was tried (Claude Design canvas and a hand-drawn SVG) and dropped: it didn't work; the canvas was deleted; #8 sage backdrop around the booking app on computers (#18).
- **Fixes:** Open Play was hidden in Week/Month when a List filter was on (#15); a staff browser test failed depending on the time of day (#12); website Classes card listed old placeholder classes (#17).
- **Extend pack** button for managers on a customer's page (#19): the agreed rule existed in the database but had no button.
- **Database:** migration `20261027000001_timetable_type_pictures` and `supabase/data/20261027-class-types.sql` (Core & Cuddle, Mum & Bub Yoga, Wiggle & Wonder types with badges; packs cover them) applied to **staging and production**.
- **November timetable loaded in production** (and staging): 16–30 Nov, 28 sessions. Classes 9:00–10:00, 10 places: Core & Cuddle Mon/Fri/Sat (Phuong), Mum & Bub Yoga Tue/Thu, Wiggle & Wonder Sun (Ánh and Oanh not linked yet: no emails). Open Play 10:00–12:00 every day, no limit (capacity empty). The SQL is idempotent (skips a start time that already has a session).
- **Staging test:** a test class on 28 Oct and Jack's booking; the confirmation email landed in the inbox.
- **Docs for the owners** (Claude Docs, private until Jack shares them; comment notifications to this session could not be set up, so ask Jack whether there are comments):
  - [Minimum sign-ups per class](https://claude.ai/artifact/SHe66tv5shTfwmMbvrD5hg): proposal + 5 decisions with dropdowns, decide by 5 Nov.
  - [Cancellation and privacy policies (draft)](https://claude.ai/artifact/8BAB2uwwbf1u5eKkfEhRM9): both pages, [Proposed] / [Pending] / [PLACEHOLDER] marks, questions for the owners and a legal advisor.
  - [Staff guide](https://claude.ai/artifact/YDQqSL7FqrPNEqdwkQKaZT): logging in, a normal day, how-tos, the automatic rules.
- **Reminder** scheduled into this session for **23 Nov 09:00 Saigon** to confirm the December timetable (and chase descriptions, instructor emails, opening weekend).

**Waiting on the owners (launch blockers first):**
1. Privacy policy and cancellation terms agreed (the app pages still show a placeholder) and checked by a Vietnamese legal advisor.
2. Opening weekend (14–15 Nov) schedule: nothing is bookable before 16 Nov.
3. Minimum sign-ups decisions (by about 5 Nov).
4. Class descriptions, "suits" and "bring" for each class (managers can type descriptions in Catalog; suits/bring via Claude for now).
5. Oanh's and Ánh's emails (instructor accounts, then link their sessions).
6. Vietnamese wording check (all screens and emails are drafts).
7. Optional: the same zoomed-out map captured larger (the current screenshot is 741 px wide, so it can look slightly soft on sharp laptop screens). Send it as a file: images pasted into the chat aren't always available as files.
8. Studio photo; WhatsApp/Zalo number; whether the contact email switches to hello@thevillagesaigon.com; website title/hero copy still says "Pilates and movement"; December timetable.

**Next for Claude:**
1. Minimum sign-ups (about half a day) once decided; it becomes the next change-list number.
2. Load content as it arrives.
3. Final check on production (booking, cancellation, pack sale, check-in, every email, with test accounts, then clean up) and a go-live checklist.
4. DMARC to `p=quarantine` at Namecheap (owner) once an email sent from hello@ is confirmed to land in the inbox.
5. ~~Remove the 28 Oct test class and booking from staging.~~ Done 27 Oct.
6. Before each owner/team test round: run `npm run check:staging` and look over its screenshots.

## Handover (26 Oct, end of day)

**Go-live item left:** tighten DMARC at Namecheap from `p=none` to `p=quarantine` once real booking emails are seen arriving in inboxes.

**Staging (set up 26 Oct, owners chose a long-lived branch):** branch `staging` → fixed preview link https://thevillage-booking-git-staging-the-village-c37390c6.vercel.app (staging database). Vercel `APP_URL` is set for previews of the `staging` branch only; staging `app_config` (`app_url` = that link, `cron_secret` = Vercel preview `CRON_SECRET`, fingerprints checked) and staging Auth site URL point at it. Tested from the staging DB: email job 200 `{"sent":0,"failed":0}`, health `"database":"ok"`. **To update staging:** merge `main` (or a feature branch) into `staging` and push; Vercel rebuilds the same link. Don't delete the `staging` branch.

**Where things stand:** all build stages (3–10) are **merged to `main` (26 Oct, merge commit `bba1a93`)**, with CI green on `main`. Production on Vercel serves `main`: `book.` and `staff.thevillagesaigon.com` (booking) and `thevillagesaigon.com` (website). The production database holds only the two manager accounts (no customers, sessions or bookings yet). Every service is set up (Supabase, Resend, Vercel, domains, BotID, Sentry, UptimeRobot). The stage branches were deleted on merge; new work goes on a new branch with its own PR.

**Approved by the owners (Jack, 26 Oct):**
- All 7 PRs, to be merged in order: jackkimber-ops/thevillage#1 stage 3 → `main`, #2 stage 4, #3 stages 5–6, #4 stage 7, #5 stage 8, #6 stage 9, #7 stage 10 (each PR is based on the one before; the newest branch `build/stage-10-ops` contains everything). "Automatically delete head branches" is on, so after each merge GitHub moves the next PR onto `main`.
- The Vietnamese wording: stage 8 emails and the stage 10 bot-check message.

**Next steps, in order (tell the owner before each one that creates something or changes production):**
1. ~~Merge the PRs in order (#1 → #7).~~ **Done 26 Oct** with merge commits (not squash, to keep the stacked branches intact). Note: between 16:44 and 16:48 UTC six "Redeploy" builds of the old stage 9 commit were made from the Vercel dashboard (during the Sentry settings edits) and went live on `book.`/`staff.` until the merge replaced them; the production database showed no activity. **Don't use Vercel's Redeploy button on old deployments**: it can put an old build live.
2. **Go-live jobs (not done yet):**
   - ~~Production `app_config`~~ **Done 26 Oct:** `app_url` = `https://book.thevillagesaigon.com`, `cron_secret` = Vercel production `CRON_SECRET` (fingerprints checked). Tested from the production DB via `pg_net`: `/api/jobs/send-emails` returns 200 `{"sent":0,"failed":0}` with the secret and 401 without; `/api/health` returns `"database":"ok"`; `book.` and the website return 200. Booking confirmations and reminders now send in production. Staging `app_config` still waits for a fixed staging URL (next point).
   - ~~Staging email jobs~~ **Done 26 Oct:** see "Staging" above.
   - ~~UptimeRobot monitors~~ **Done 26 Oct:** the 3 monitors were recreated from scratch by Jack and are running (all green, every 5 minutes). Alerts go only to jack.kimber@gmail.com (extra alert contacts need a paid plan).
   - Tighten DMARC at Namecheap from `p=none` to `p=quarantine` once confirmations and login emails are seen landing in inboxes.
3. **Stage 10 in the build plan (testing and go-live):** owner testing on staging, real timetable, instructor accounts, policy wording, go-live checklist. Needs the items under "Waiting on the owners".
4. **Later (needs repo admin):** branch protection on `main`, required checks, Dependabot.

**Session limits to know about:** this cloud session's network blocks `*.supabase.co`, `*.vercel.app`, Sentry, UptimeRobot, Namecheap and DNS lookups. Use the Supabase Management API (`/v1/projects/{ref}/database/query`) for SQL and `pg_net` from inside the database to reach the project's own Auth API. Repo settings can't be changed from the session (the owner does those). Claude in Chrome isn't available in cloud sessions.

### Setup record (26 Oct)
- **Accounts:** Vercel team "The Village" (Pro, `team_nLf9YIAx50eRAXjapeiTiLY1`, slug `the-village-c37390c6`), Supabase org "The Village" (Pro), Resend (Pro). Keys come in through the session proxy (`api.vercel.com`, `api.supabase.com`, `api.resend.com`).
- **Supabase:** `thevillage-staging` ref `rtpgifqvgcaoslhkbrpe`, `thevillage-production` ref `mehfqyfinxjiknsvupop` (Micro, ap-southeast-1; created by Jack, DB passwords with the owners). All 7 migrations + `seed.sql` on both (recorded in `supabase_migrations.schema_migrations`); 20 tables, RLS on all; 3 cron jobs. Keep "Automatically expose new tables" **on** (migrations rely on default grants; add explicit grants before switching it off).
- **Auth (both):** 6-digit code, 10 min, `login-code.html` as Magic Link and Confirm signup template; Resend SMTP (`smtp.resend.com:465`, user `resend`, sender `The Village <hello@thevillagesaigon.com>`, 100 emails/hour, keys `supabase-auth-staging` / `supabase-auth-production`). Production site URL `https://book.thevillagesaigon.com`, redirects for `book.` and `staff.`; staging site URL = the `staging` branch link, redirects for `https://*-the-village-c37390c6.vercel.app/**`. Test login email landed in the inbox.
- **Staff:** Phuong (ph.nguyen4787@gmail.com) and Caroline (yousun.nam@gmail.com) are `manager` on staging and production (pre-confirmed auth users made via SQL; no email sent).
- **Resend:** `thevillagesaigon.com` verified (id `9891ba81-deb6-4afa-9920-22b1986a2c4d`, ap-northeast-1; DKIM `resend._domainkey`, `send` MX + TXT, `rsend` CNAME, `_dmarc` p=none at Namecheap).
- **Vercel:** `thevillage-booking` (root `apps/booking`, `book.` + `staff.`) and `thevillage-website` (root `apps/website`, apex + `www` → apex), linked to GitHub, production branch `main`, functions `sin1`, Node 22, previews open to anyone with the link. Env: production → production Supabase, preview → staging Supabase; `CRON_SECRET` per environment; `EMAIL_FROM`; booking production `APP_URL`; `RESEND_API_KEY` (`booking-app-staging` → preview, `booking-app-production` → production); Sentry vars (below). DNS at Namecheap confirmed (apex A 216.150.1.1 + 216.150.16.1; `www` CNAME ce021a7f00869806.vercel-dns-016.com; `book` + `staff` CNAME acbf00b5c9e17dba.vercel-dns-016.com). Watch out: Vercel made the very first build of each new project a production build of a stage branch; both were cancelled.
- **CI:** first runs exposed two problems, fixed on stages 3/4 and merged forward: runners pinned to `ubuntu-24.04` (Ubuntu 26 breaks Playwright `--with-deps`); `typescript` added to `supabase/tests`. The "Vercel – thevillage-website" check fails on #1–#5 because `apps/website` only exists from stage 9 (noted in those PRs).
- **Stage 10 (`build/stage-10-ops`, #7):** Vercel BotID instead of Turnstile on login (customer and staff) and guest booking (Vercel only; basic mode, Deep Analysis is paid and off; if BotID errors the request goes through). Sentry, errors only, customer data collection off (Sentry v11 defaults would send user info, cookies, headers, form bodies, query strings); EU region, org `thevillage`, project `thevillage-booking`; source maps uploaded to `https://de.sentry.io/` with Organization token `vercel-thevillage-booking-3`, then deleted; a failed upload only warns. `/api/health` checks the database (503 if not).
- **UptimeRobot (running since 26 Oct, free plan):** `https://book.thevillagesaigon.com/api/health` (shows `"database":"ok"`; returns 503 if the database is down), `https://book.thevillagesaigon.com`, `https://thevillagesaigon.com`. Every 5 minutes. Alerts only to jack.kimber@gmail.com (extra contacts need a paid plan). Not reachable from the cloud session; the owner manages it.

## Next
- Stage 2 (owners): buy the domain and open the paid accounts, see `docs/owner-checklist.md` and `docs/build-plan.md`.
- Stage 3 (Claude): foundations on a branch, pull request with preview link.
- At build start: branch protection on `main`, pull-request checks and Dependabot (needs repo admin settings).

- 22 Oct: **designs v3**: all 29 screens redesigned to the full visual style (logo, rounded cards, coloured session pictures, brand fonts), not just recoloured.
- 22 Oct: **clickable prototype** of the customer flow on the canvas (open 'C1 · Log in' and press Play).
- 22 Oct: customer timetable gets **Week** and **Month** views (owner request), screens C4b and C4c.
- 22 Oct: all open questions in sections A–C answered (see `docs/open-questions.md`).

- 24 Oct: second release moved to +1 month; C6 wording; open play hides places left (owner comments).
- 25 Oct: team comments (Robva) answered on the canvas: new C0 Home, C2b Your details, C6b Add a child; menu and language button on every customer screen; attendance report; "get in touch" list. All threads replied to.
- 25 Oct: **designs signed off.** Build plan in `docs/build-plan.md`.

## Waiting on the owners
- **Instructors:** agreed (7 Nov); Jack adds them on the Staff page, then they're set on their sessions (by a manager, or Claude in bulk). Phuong teaches Core & Cuddle.
- **December timetable:** nothing is loaded from 1 Dec, and early December already shows (empty) to customers booking a month ahead. Needed as soon as possible; managers can add it (Calendar, "Every week") or send it to Claude. (Children's classes, if they come back: price per child, packs, two badges, and booking a child without a parent to build.)
- **Strong & Snuggly:** not on the agreed November schedule.
- **Closure days** (e.g. Tết, around 6–10 Feb 2027): sessions currently run every day. Managers can enter them under Settings → closures.
- Privacy policy and cancellation terms (EN and VI); studio photo for the login and home screens; website photos, FAQ and headline copy.
- A native speaker to read the new Vietnamese: the home-screen card, calendar card, "studio is closed" note and the "sorry, that didn't load" page.
- Optional: `sentry.io` allowed in the environment's network settings plus a read-only Sentry token, so Claude can read new errors directly (today Jack pastes them in).
- **WhatsApp and Zalo on the business number +84 906 446 214:** then the buttons switch (Settings, or Claude).
- When to switch the customer-facing contact email to hello@thevillagesaigon.com.
- SVGs of the full-colour wordmark and badges (later).

## Sign-off log
- **Designs signed off 25 Oct 2026** in the Claude session by Jack (jack@savian.ai.vn) for the owners ("consider #1 signed off"). Frozen at canvas version 70 (https://claude.ai/artifact/Lc55EEnJbQhBEtzfheUhCF). Build may start; changes now go through `docs/change-list.md`.
- **PRs #1–#7 (stages 3–10) and the Vietnamese wording (stage 8 emails, stage 10 bot-check message) approved 26 Oct 2026** in the Claude session by Jack (jack@savian.ai.vn) for the owners ("consider these approved"). Merge in order, #1 first.
