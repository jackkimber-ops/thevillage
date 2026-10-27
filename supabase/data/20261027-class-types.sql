-- Change list #5 (27 Oct 2026): one session type per class, each with its own badge.
-- Applied once to staging and production; the same rows are in seed.sql for new databases.
-- Safe to run again. Descriptions are placeholders until the owners send them.

insert into public.session_types (id, kind, name, description, colour, picture_url, default_minutes, default_capacity, drop_in_price_vnd) values
  ('00000000-0000-4000-8000-000000000004', 'class', 'Core & Cuddle',
   '[PLACEHOLDER: description to come]', '#858152', '/brand/badges/core-cuddle.png', 60, 10, 450000),
  ('00000000-0000-4000-8000-000000000005', 'class', 'Mum & Bub Yoga',
   '[PLACEHOLDER: description to come]', '#C2BE8E', '/brand/badges/mum-bub-yoga.png', 60, 10, 450000),
  ('00000000-0000-4000-8000-000000000006', 'class', 'Wiggle & Wonder',
   '[PLACEHOLDER: description to come]', '#F78666', '/brand/badges/wiggle-wonder.png', 60, 10, 450000)
on conflict (id) do update set name = excluded.name, colour = excluded.colour, picture_url = excluded.picture_url;

update public.session_types set colour = '#FFBA9B', picture_url = '/brand/badges/open-play.png'
where id = '00000000-0000-4000-8000-000000000002';

-- Every class pack covers the new classes (otherwise credits couldn't be used on them).
insert into public.pack_type_covers (pack_type_id, session_type_id)
select p.id, t.id
from public.pack_types p
cross join (values ('00000000-0000-4000-8000-000000000004'::uuid), ('00000000-0000-4000-8000-000000000005'::uuid), ('00000000-0000-4000-8000-000000000006'::uuid)) t(id)
where p.id in ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103')
on conflict do nothing;
