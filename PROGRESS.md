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

## Handover (26 Oct): start here in a new session

- **All build work is on stacked branches**, each built on the one before: `build/stage-3-foundations` → `build/stage-4-database` → `build/stage-5-6-customer-site` → `build/stage-7-staff-app` → `build/stage-8-emails` → `build/stage-9-website`. **The newest branch (`build/stage-9-website`) contains everything.** Nothing is merged to `main` yet (owners approve each PR first).
- **Stage 2 done by the owners (26 Oct):** domain + Namecheap mailbox, Supabase organisation (Pro, no projects yet), Vercel team (Pro), Resend (Pro). Keys are in the environment as `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `RESEND_API_KEY`; allowed domains api.vercel.com, api.supabase.com, *.supabase.co, api.resend.com.
- **Next steps, in order (tell the owner before each one that creates something):**
  1. ~~Check each key works (read-only calls).~~ **Done 26 Oct**: all three keys work. Vercel team "The Village" (Pro, `team_nLf9YIAx50eRAXjapeiTiLY1`), Supabase org "The Village" (Pro), Resend.
  2. ~~Create Supabase projects~~ **Done 26 Oct** (projects created by Jack in the dashboard; DB passwords are with the owners, not in the repo):
     - `thevillage-staging` ref `rtpgifqvgcaoslhkbrpe`, `thevillage-production` ref `mehfqyfinxjiknsvupop`; both Micro, ap-southeast-1.
     - All 7 migrations + `seed.sql` applied to both (recorded in `supabase_migrations.schema_migrations`); 20 tables, RLS on all; 3 cron jobs scheduled.
     - Auth on both: 6-digit code, 10 min, `login-code.html` as both the Magic Link and Confirm signup template. Production site URL `https://book.thevillagesaigon.com`, redirects allowed for `book.` and `staff.`.
     - **Still to do:** staging site URL + redirect list (needs the Vercel preview URL, step 5); `app_config` app_url + cron_secret on both (step 5, same secret goes into Vercel as `CRON_SECRET`); custom SMTP via Resend (after step 4; until then Auth uses Supabase's built-in email, max 2 emails/hour).
     - Keep "Automatically expose new tables" **on**: migrations rely on default table grants. To switch it off later, first add a migration with explicit grants.
  3. ~~Staff~~ **Done 26 Oct** on staging and production: auth users for Phuong (ph.nguyen4787@gmail.com) and Caroline (yousun.nam@gmail.com) created pre-confirmed (no email sent), both `manager` in `staff_roles`; checked `is_manager()` is true for Phuong on staging. Note: this session's proxy blocks `*.supabase.co`, so the users were made via SQL through the Management API (auth.users + auth.identities), not the Auth admin API.
  4. **Done 26 Oct:** `thevillagesaigon.com` verified in Resend (id `9891ba81-deb6-4afa-9920-22b1986a2c4d`, region ap-northeast-1; DKIM `resend._domainkey`, `send` MX + TXT, `rsend` CNAME, `_dmarc` p=none, set at Namecheap). Supabase Auth on both projects now sends via Resend SMTP (`smtp.resend.com:465`, user `resend`, sender `The Village <hello@thevillagesaigon.com>`, 100 emails/hour) using sending-only keys `supabase-auth-staging` / `supabase-auth-production` (stored only in Supabase). Later: tighten DMARC to `p=quarantine` once both senders are confirmed working. Original note: Resend: add `thevillagesaigon.com`, set DNS records at Namecheap (SPF/DKIM/DMARC) together with the Private Email records; `EMAIL_FROM`.
  5. **Done 26 Oct (except items marked still to do):** Vercel projects `thevillage-booking` (root `apps/booking`, domains `book.` + `staff.`) and `thevillage-website` (root `apps/website`, apex + `www` → apex 308) created in team "The Village", linked to GitHub, functions `sin1`, Node 22, preview protection off (owners' choice: anyone with the link). Env vars set: production → production Supabase, preview → staging Supabase; `CRON_SECRET` per environment; `EMAIL_FROM`; booking production `APP_URL`; `RESEND_API_KEY` (sending-only keys `booking-app-staging` → preview, `booking-app-production` → production). Test login email from staging landed in the inbox (26 Oct). Note: Vercel made the very first build of each new project a *production* build of `build/stage-9-website`; both were cancelled and re-run as previews. Previews: booking `https://thevillage-booking-git-build-stage-ac0eb7-the-village-c37390c6.vercel.app`, website `https://thevillage-website-git-build-stage-eee4e2-the-village-c37390c6.vercel.app`. Staging Supabase site URL = booking preview; redirects allowed for `https://*-the-village-c37390c6.vercel.app/**`. Namecheap DNS done and confirmed by Vercel (apex A 216.150.1.1 + 216.150.16.1; www CNAME ce021a7f00869806.vercel-dns-016.com; book + staff CNAME acbf00b5c9e17dba.vercel-dns-016.com). **Still to do:**  staging `APP_URL` (previews have per-branch URLs); `app_config` (app_url, cron_secret) on both DBs once the app is live there. Original note: Vercel: two projects from the repo, root `apps/booking` (domains book. + staff.) and `apps/website` (apex + www), functions in sin1; env vars per `.env.example` (preview → staging keys only).
  6. **Done 26 Oct:** stacked PRs opened, each with preview links and what to check: jackkimber-ops/thevillage#1 stage 3 → `main`, #2 stage 4, #3 stages 5–6, #4 stage 7, #5 stage 8, #6 stage 9 (each based on the one before). First CI runs ever exposed two CI problems, fixed on stage 3/4 and merged forward: runners pinned to `ubuntu-24.04` (`ubuntu-latest` became Ubuntu 26 on 19 Oct; Playwright `--with-deps` fails there) and `typescript` added to `supabase/tests` (CI's `npx tsc` was fetching the unrelated `tsc` package). The "Vercel – thevillage-website" check fails on #1–#5 because `apps/website` only exists from stage 9; noted in those PRs. Repo setting "Automatically delete head branches" turned on by Jack (26 Oct), so after each merge GitHub moves the next PR onto `main`.
  7. **In progress 26 Oct (branch `build/stage-10-ops`, PR stage 10):**
     - **Bot protection: Vercel BotID instead of Cloudflare Turnstile** (owners agreed 26 Oct; included in Vercel Pro, no extra account or keys). Protects email-code login (customer and staff) and guest booking. Only runs on Vercel; off Vercel (local, CI) the check is skipped, and if BotID itself errors the request is let through and logged. Basic mode only: "Deep Analysis" in the Vercel Firewall is paid per check, not turned on.
     - **Sentry** wired in (errors only, no tracing). Customer data collection switched off explicitly (Sentry v11 defaults collect user info, cookies, headers, form bodies and query strings). Off until `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel. **Waiting on owners:** free sentry.io account, Next.js project `thevillage-booking`, send the DSN.
     - **Health route** `/api/health` now reads studio settings from the database; returns 503 if it can't.
     - **Waiting on owners:** free UptimeRobot account; then monitors for `book.` home, `book.`/api/health and the website.

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
- SVGs of the full-colour wordmark and badges (later).

## Sign-off log
- **Designs signed off 25 Oct 2026** in the Claude session by Jack (jack@savian.ai.vn) for the owners ("consider #1 signed off"). Frozen at canvas version 70 (https://claude.ai/artifact/Lc55EEnJbQhBEtzfheUhCF). Build may start; changes now go through `docs/change-list.md`.
