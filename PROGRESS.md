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
- Instructor names and emails (Caroline: yousun.nam@gmail.com, received 26 Oct), and whether +84 933 834 068 is the studio's WhatsApp and Zalo number. (Address and opening hours received 21 Oct.)
- For go-live (by about 10 Nov, see `docs/build-plan.md`): first month's timetable (classes, days, times, instructor); privacy policy and cancellation terms (EN and VI); studio photo for the login and home screens.
- SVGs of the full-colour wordmark and badges (later).

## Sign-off log
- **Designs signed off 25 Oct 2026** in the Claude session by Jack (jack@savian.ai.vn) for the owners ("consider #1 signed off"). Frozen at canvas version 70 (https://claude.ai/artifact/Lc55EEnJbQhBEtzfheUhCF). Build may start; changes now go through `docs/change-list.md`.
- **PRs #1–#7 (stages 3–10) and the Vietnamese wording (stage 8 emails, stage 10 bot-check message) approved 26 Oct 2026** in the Claude session by Jack (jack@savian.ai.vn) for the owners ("consider these approved"). Merge in order, #1 first.
