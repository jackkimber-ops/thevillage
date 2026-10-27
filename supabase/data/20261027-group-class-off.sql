-- 27 Oct (Jack): the generic "Group class" type from setup is switched off, so staff only see the
-- four real types (Core & Cuddle, Mum & Bub Yoga, Wiggle & Wonder, Open Play). Applied to staging and production.
update public.session_types set active = false where id = '00000000-0000-4000-8000-000000000001';
