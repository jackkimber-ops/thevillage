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

## Handover (26 Oct, end of day): start here in a new session

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
