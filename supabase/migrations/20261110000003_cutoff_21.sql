-- Free cancellation until 21:00 the evening before (owners, 10 Nov; was 20:00). Change #41.
-- The live value is the studio setting (Settings in the staff app); this only changes the default for new databases.
-- Staging and production are set by supabase/data/20261110-cutoff-21-intro-1-month.sql.
alter table public.studio_settings alter column cancel_cutoff_time set default '21:00';
