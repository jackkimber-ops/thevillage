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
  1. Check each key works (read-only calls).
  2. Create Supabase projects in Singapore: staging (Micro) and production; apply `supabase/migrations`, `supabase/seed.sql`; set Auth (email OTP 6 digits/10 min, custom SMTP via Resend, `supabase/templates/login-code.html`, site URL); set `app_config` (app_url, cron_secret) per environment.
  3. Staff: Phuong (ph.nguyen4787@gmail.com) and Caroline (yousun.nam@gmail.com) as managers in `staff_roles` after their auth users exist.
  4. Resend: add `thevillagesaigon.com`, set DNS records at Namecheap (SPF/DKIM/DMARC) together with the Private Email records; `EMAIL_FROM`.
  5. Vercel: two projects from the repo, root `apps/booking` (domains book. + staff.) and `apps/website` (apex + www), functions in sin1; env vars per `.env.example` (preview → staging keys only).
  6. Open one PR per stage (3 → 9) with preview links for the owners.
  7. Later: Turnstile, Sentry, uptime monitor (free; ask first).

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
