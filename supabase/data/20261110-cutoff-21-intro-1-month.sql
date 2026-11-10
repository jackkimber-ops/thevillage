-- Owners, 10 Nov (change #41): free cancellation until 21:00 the evening before (was 20:00); later than that the
-- credit is used (unchanged). The intro (trial) pack is valid 1 month (was 3 weeks), for packs sold from now on.
-- Applied to staging, then production (no intro packs sold on either yet).
begin;
update public.studio_settings set cancel_cutoff_time = '21:00';
update public.pack_types set validity_months = 1, validity_days = null where id = '00000000-0000-4000-8000-000000000103';
commit;
