# The Village booking system

Booking system for **The Village - Family Club** (Saigon), opening **14 November 2026**.
Built from scratch: no code or data copied from any other studio's system.

The brief lives in `docs/requirements/`:
- `requirements-and-mvp.pdf` — **what** to build (wins on what to build)
- `developer-notes.pdf` — **how** to build it (wins on how to build it)
- Mockup vs requirements: requirements win unless a row is ticked Mockup.

Progress, next steps and what's waiting on the owners: `PROGRESS.md`.
Open questions for the owners: `docs/open-questions.md`.

## Current phase: DESIGN

Nothing is coded until the owners have approved the wireframes and visuals.
**Do not** write app code, create database tables or set up paid services before written owner sign-off
(record the sign-off date in `PROGRESS.md`).

## Working rules

- Explain each step in plain words before doing it, and what the owners need to check.
- Ask before anything that costs money, creates an account, sends messages to customers or changes production.
- Never merge to `main` or change the production database without an owner's approval.
- Ask before guessing. Use clearly marked placeholders (`[PLACEHOLDER: …]`) for prices, opening hours, wording and pictures until the owners supply them.
- GitHub is the master copy: commit and push at the end of every working session and after each finished step. Work in progress goes on a branch and is pushed too.
- Everything goes in the repo: code, migrations, seed data, wireframes, design files, this file, `PROGRESS.md`.
- Secrets never go in the repo. Keys live in Vercel / Supabase environment settings; `.env.example` lists names only; `.env*` is gitignored.
- After design sign-off, changes go into a change list and are agreed before they're built.
- Build one phase at a time, each as a pull request with a preview link; owners approve before merge.

## Tech stack (pin latest stable at setup)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| DB / auth / storage | Supabase (Postgres, Auth, Storage, Realtime) — staging + production projects, Singapore (ap-southeast-1) |
| Hosting | Vercel Pro, functions in `sin1`. Two projects: **website** (`thevillagesaigon.com`) and **booking app** (`book.` customer site + `staff.` staff app, one Next.js app routed by hostname) |
| Email | Resend, also as Supabase Auth custom SMTP. Never Supabase built-in email in production |
| Email templates | React Email, one template per language (EN/VI) |
| Translations | next-intl — customer site, website and emails only; staff app is English |
| Session pictures | Supabase Storage public bucket, resized on upload |
| Calendar feeds | `.ics` route per user behind a secret, revocable token; titles only, no names |
| Bot protection | Cloudflare Turnstile (or Vercel BotID) on guest booking and login forms |
| Errors / uptime | Sentry (free), free uptime monitor on booking site + health route |
| Tests | Vitest (rules, DB functions), Playwright (booking flow); run in CI on every PR |
| Scheduled jobs | Supabase `pg_cron` (not Vercel cron). Email jobs call a protected route / Edge Function |

Environments: Local (Supabase CLI + Docker) · Preview (staging Supabase, every PR) · Production (`main` only).
Preview deployments never hold production keys. DB changes only via migration files. Seed data in a seed file.

## Core rules the build must get right (all need automated tests)

1. **Credit reservation** — booking reserves a credit immediately; used once the session ends.
2. **Automatic attendance** — `pg_cron` every 15 min closes finished sessions (unmarked → attended, reserved → used).
3. **Safe booking** — one DB function locks the session row, checks capacity, picks the pack, writes booking + reserve ledger row in one transaction. The app calls only this function.
4. **Booking rules** — pack that expires first among packs covering the session type and valid *on the session date*; one intro pack and one free trial per customer; one parent + up to 2 children per booking (class: 1 credit per parent, children free; open play: 1 credit per child, parents free); guests (not logged in) max one unpaid booking; logged-in customers may book several unpaid dates; guests matched to existing customers by phone or email.
5. **Studio settings, not hard-coding** — name, contact details, booking rules, messaging links in `studio_settings`.
6. **Vietnam time** — `timestamptz` everywhere; date logic and jobs in `Asia/Ho_Chi_Minh` (UTC+7).
7. **Calendar** — staff: day/week/month, drag to move; one room, so an exclusion constraint (`btree_gist`) forbids overlaps.

Database also enforces: unique active booking per (session, customer); customers unique by phone (E.164 `+84…`) and lowercase email; VND as `bigint`; RLS on every table; credits as an append-only ledger (never update/delete; balance = sum); anonymise-not-delete for customers (M10) — design FKs for it.

## Agreed business rules (20–21 Oct)

- Free cancellation until **20:00 the evening before**; inside the cutoff Cancel becomes "Message us", staff cancel, credit used unless a manager restores it. No-show: credit used.
- Book up to **1 month** ahead, up to **1 hour** before start. Staff can override both, never capacity.
- Expired pack can't be used; staff can extend.
- Private hire: 1 or 2 h, in open hours, ≥ 24 h notice, priced and paid in person; arranged on WhatsApp/Zalo, staff add it to the calendar.
- Prices (updated 21 Oct): single class / drop-in **450,000 VND** (was 400,000; higher on purpose to encourage packs); 10-class pack **4,000,000** (400,000/class); 20-class pack **7,200,000** (10% off, 360,000/class); intro pack 3 classes 750,000 (new customers only, sold by a manager); open play 150,000 per child, paid on the day (no open play packs at launch). Validity: 10-class pack **3 months**, 20-class pack **7 months** (calendar months from the valid-from date). Intro pack valid **3 weeks**. No promotions in the app at launch (the opening-weekend free class is handled offline). **Undecided:** 40/60 packs and open play packs are undecided and not on sale. All prices live in the catalog, never in code.
- No online payment. Payment by QR at check-in (cash/transfer also recorded). Managers only record payments.
- Unpaid late cancellation: no fee at launch; no screen says "full price due".
- Multi-date booking = pick dates one by one; nothing repeats automatically (no recurring series).
- Reminder emails at 18:00 the day before.
- Customers give a **mobile number** plus a **preferred contact: WhatsApp, Zalo or call** (guest form and staff "add customer"); store it on the customer and show it in the call-to-confirm list.
- Login screen has a full-width studio photo header (photo to come).
- Customer timetable (changed 22 Oct, reverses 21 Oct): **List** (default, week list by day), **Week** (7-day grid) and **Month** (calendar with dots; tap a day to see its sessions). Month greys out days beyond the 1-month booking window.
- Open play: up to 2 children (1 credit or 150,000 each) and up to 2 parents free per booking.
- Booking after the cutoff is allowed (until 1 h before start); the confirm screen says "This booking can't be cancelled online".
- Login email: 6-digit code with a one-tap link underneath; the screen asks for the code. WhatsApp/Zalo login hidden until Meta/Zalo approve (after business registration).
- No limit on unpaid bookings for logged-in customers (all go to the call-to-confirm list). Free trial is for a class only and doesn't block the intro pack later.
- Selling a pack to a customer with unpaid bookings switches those bookings to credits from the new pack.
- Private hire: no group-size limit.
- Instructors default to "own sessions only" access.
- Staff dragging a session to a new time moves its bookings with it and emails everyone booked; a move that overlaps another session is refused.
- Studio: 47/1 Quốc Hương, An Khánh, Hồ Chí Minh. Open every day 8:30–17:00. Contact email for now: thevillage.saigon@gmail.com, later hello@thevillagesaigon.com (one shared Namecheap mailbox; staff log in with personal emails). Contact/WhatsApp/Zalo for now: +84 933 834 068 (temporary until the business is registered). Social: facebook.com/thevillage.saigon, instagram.com/thevillage.saigon, Messenger m.me/thevillage.saigon. Name is written "The Village - Family Club". All of these go in `studio_settings`, never in code.

## Roles

Manager (2: Phuong, who also teaches, and Caroline) and Instructor (up to 4, names to come); a manager can also teach. Roles in `staff_roles` / `app_metadata`, **never** `user_metadata`.
Enforced by RLS and DB functions, not by hiding pages. See the "Who can do what" and RLS tables in developer notes.
