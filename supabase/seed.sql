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
