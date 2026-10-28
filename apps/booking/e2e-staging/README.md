# Staging check

A full check of the booking site and staff app against **staging** (the real staging database, emails and jobs),
on a phone and a computer. Run it before asking the owners or staff to test, and before each release.

```
npm run check:staging
```

It needs these in the environment (never in the repo):

| Name | What |
|---|---|
| `STAGING_SUPABASE_URL` | `https://<staging ref>.supabase.co` |
| `STAGING_PROJECT_REF` | staging project ref (SQL goes through the Supabase Management API) |
| `STAGING_SERVICE_KEY` | staging service-role key (makes test logins without sending emails) |
| `STAGING_ANON_KEY` | staging anon key (checks that logged-out visitors can't read private tables) |
| `QA_BYPASS_TOKEN` | same value as the Vercel variable of that name (staging branch only): lets the check past the bot check |
| `CHROME_PATH` | optional, a Chromium to use |
| `SHOTS_DIR` | optional, where screenshots go for a visual look-over (default `test-results/shots`) |

What it does:
- **01 public pages**: every page opens without errors, broken images or sideways scrolling, in English and Vietnamese; timetable, map, message-us links, hire form.
- **02 customer journeys** (phone): guest booking and its limits, login, first-time details, booking, ✓ Booked, cancelling, full sessions, the cancellation cutoff, the 1-hour limit, packs.
- **03 staff app** (phone and computer): manager and instructor tasks, and what instructors can't do.
- **04 system**: every email sent, scheduled jobs healthy, the credit ledger adds up, private tables closed to logged-out visitors.

Test people use Resend's test inbox (`delivered+qa-…@resend.dev`), so nobody real is emailed.
Everything it creates is called "QA …" and is removed before and after each run (`cleanup.sql`). While it runs, studio alert emails go to Resend's test inbox; afterwards the address in use before the run is put back (`hello@thevillagesaigon.com` since 28 Oct).
