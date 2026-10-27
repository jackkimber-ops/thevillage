-- Seed data: studio settings and the launch catalog (agreed 21-22 Oct 2026).
-- Prices live here and in the catalog screens, never in app code.

insert into public.studio_settings (
  name, address, opening_hours, contact_email, contact_phone,
  whatsapp_url, zalo_url, messenger_url, facebook_url, instagram_url, maps_url
) values (
  'The Village - Family Club',
  '47/1 Quốc Hương, An Khánh, Hồ Chí Minh',
  'Every day 8:30–17:00',
  'thevillage.saigon@gmail.com',
  '+84933834068',
  'https://wa.me/84933834068',
  'https://zalo.me/0933834068',
  'https://m.me/thevillage.saigon',
  'https://www.facebook.com/thevillage.saigon',
  'https://www.instagram.com/thevillage.saigon',
  'https://maps.app.goo.gl/shhU5KCEVMMrX4cd8'
);

insert into public.session_types (id, kind, name, description, colour, default_minutes, default_capacity, drop_in_price_vnd) values
  ('00000000-0000-4000-8000-000000000001', 'class', 'Group class',
   '[PLACEHOLDER: class names and descriptions come with the first month''s timetable]', '#C3BF94', 60, 10, 450000),
  ('00000000-0000-4000-8000-000000000002', 'open_play', 'Open Play',
   '[PLACEHOLDER: description to come]', '#FFBEA1', 90, 10, 150000),
  ('00000000-0000-4000-8000-000000000003', 'private_hire', 'Private hire',
   'Hire the whole studio for 1 or 2 hours. Arranged by message.', '#E8E3C5', 60, null, null);

insert into public.pack_types (id, name, credits, price_vnd, validity_months, validity_days, is_intro) values
  ('00000000-0000-4000-8000-000000000101', '10-class pack', 10, 4000000, 3, null, false),
  ('00000000-0000-4000-8000-000000000102', '20-class pack', 20, 7200000, 7, null, false),
  ('00000000-0000-4000-8000-000000000103', 'Intro pack · 3 classes', 3, 750000, null, 21, true);

insert into public.pack_type_covers (pack_type_id, session_type_id) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001');

-- Change list #5 (27 Oct): one session type per class, each with its own badge (same as supabase/data/20261027-class-types.sql).
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
