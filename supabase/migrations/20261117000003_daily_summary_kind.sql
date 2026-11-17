-- Daily summary (change #51), step 1: the new email kind. A new enum value must be committed before it is used,
-- so it gets its own migration; the rest is in 20261117000004_daily_summary.sql.
alter type public.notification_kind add value if not exists 'daily_summary';
