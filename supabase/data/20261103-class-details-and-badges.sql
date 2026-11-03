-- The owners' class descriptions and taglines, badges for every class, and Phuong teaching Core & Cuddle (Jack, 3 Nov).
-- Run after migration 20261103000001_class_taglines and after the badge pictures are deployed (apps/booking/public/brand/badges).
-- Applied once to staging, then production. Vietnamese descriptions and taglines to come (until then Vietnamese pages show the English).

begin;

-- Strong & Snuggly: a new class type, not on the timetable yet (staff add sessions from the calendar).
insert into public.session_types (id, kind, name, colour, default_minutes, default_capacity, drop_in_price_vnd)
values ('00000000-0000-4000-8000-000000000009', 'class', 'Strong & Snuggly', '#FFBEA1', 60, 10, 450000)
on conflict (id) do nothing;
insert into public.pack_type_covers (pack_type_id, session_type_id)
select p.id, '00000000-0000-4000-8000-000000000009'::uuid from public.pack_types p
where p.id in ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103')
on conflict do nothing;

-- Every class has its own badge (from the Instagram set): the three unused ones go to the classes that had none.
update public.session_types set picture_url = '/brand/badges/breathe-unwind.png' where id = '00000000-0000-4000-8000-000000000007';
update public.session_types set picture_url = '/brand/badges/bump-breathe.png' where id = '00000000-0000-4000-8000-000000000008';
update public.session_types set picture_url = '/brand/badges/strong-snuggly.png' where id = '00000000-0000-4000-8000-000000000009';

-- Taglines and descriptions (English).
update public.session_types set tagline = 'Move, strengthen & bond',
  description = 'A gentle mat Pilates class designed to help mums rebuild strength, improve core stability and reconnect with their bodies after birth. With your baby right beside you, there''s no pressure to keep up or get everything perfect. Pause to feed, cuddle or settle your little one whenever you need.'
  where id = '00000000-0000-4000-8000-000000000004'; -- Core & Cuddle
update public.session_types set tagline = 'Little moves, big connections.',
  description = 'A playful yoga class for parents and little ones to move, stretch and explore together. Through simple yoga poses, playful movement, breathing and moments of calm, you''ll nurture connection while helping your child develop body awareness, balance and coordination. Little ones are free to join in at their own pace.'
  where id = '00000000-0000-4000-8000-000000000005'; -- Little Yogi & Me
update public.session_types set tagline = 'A little play, a lot of wonder.',
  description = 'A relaxed, welcoming space for little ones to play, explore and discover the world alongside their grown-ups. Through open-ended play, sensory experiences and movement, children can follow their curiosity, build confidence and learn through play, while parents connect with their little ones and other families.'
  where id = '00000000-0000-4000-8000-000000000006'; -- Wiggle & Wonder
update public.session_types set tagline = 'Move, breathe & grow together.',
  description = 'A nurturing yoga class to support you through the changes of pregnancy. Gentle movement, mobility, breathing and relaxation help you stay active, ease everyday tension and feel more comfortable in your changing body. A little time to slow down, tune in and connect with yourself and your growing baby.'
  where id = '00000000-0000-4000-8000-000000000008'; -- Bump & Breathe
update public.session_types set tagline = 'Build strength, embrace motherhood.',
  description = 'A full-body strength class designed to help mums build muscle, improve stability and develop functional strength for everyday life. Through strength-based exercises and purposeful movement, you''ll work on getting stronger, feeling more capable and building confidence, all with your little one close by.'
  where id = '00000000-0000-4000-8000-000000000009'; -- Strong & Snuggly
update public.session_types set tagline = 'Slow down, stretch & reconnect.',
  description = 'A gentle movement class for mums who need a little time to loosen up, release tension and reconnect with their bodies. Through easy stretches, mobility exercises and relaxed breathing, you''ll work on moving more comfortably and easing the stiffness that can come with pregnancy, postpartum recovery and caring for a little one. Bring your baby along and take a moment just for you.'
  where id = '00000000-0000-4000-8000-000000000007'; -- Breathe & Unwind

-- Phuong teaches every Core & Cuddle session.
update public.sessions set instructor_id = (select u.id from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = 'ph.nguyen4787@gmail.com')
where session_type_id = '00000000-0000-4000-8000-000000000004' and status = 'scheduled' and starts_at >= now();

commit;
