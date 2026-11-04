-- The owners' timetable from Monday 16 Nov 2026 (Jack, 2 Nov; "tentative": Tuesday and Thursday afternoons
-- may become classes later, open play for now). Loaded weekly until Sunday 28 Feb 2027; staff add more from the calendar.
-- Replaces the sample sessions loaded on 27 Oct. Applied once to staging, then production.
-- Instructors are not set yet (names to come); capacity 10 (parents for classes, children for open play).

-- Note (4 Nov): sessions with bookings can no longer be marked cancelled directly (migration
-- 20261104000001); cancel them with public.cancel_session, which cancels the bookings and emails people.

begin;

-- Classes. "Mum & Bub Yoga" is now "Little Yogi & Me" (same class, same badge). Two new classes, coloured dots until they have badges.
update public.session_types set name = 'Little Yogi & Me' where id = '00000000-0000-4000-8000-000000000005';

insert into public.session_types (id, kind, name, description, colour, default_minutes, default_capacity, drop_in_price_vnd) values
  ('00000000-0000-4000-8000-000000000007', 'class', 'Breathe & Unwind', '[PLACEHOLDER: description to come]', '#C3BF94', 60, 10, 450000),
  ('00000000-0000-4000-8000-000000000008', 'class', 'Bump & Breathe', '[PLACEHOLDER: description to come]', '#FFBEA1', 60, 10, 450000)
on conflict (id) do update set name = excluded.name;

-- Every class pack covers the new classes (otherwise credits couldn't be used on them).
insert into public.pack_type_covers (pack_type_id, session_type_id)
select p.id, t.id
from public.pack_types p
cross join (values ('00000000-0000-4000-8000-000000000007'::uuid), ('00000000-0000-4000-8000-000000000008'::uuid)) t(id)
where p.id in ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103')
on conflict do nothing;

-- Open play is 2 hours now.
update public.session_types set default_minutes = 120 where id = '00000000-0000-4000-8000-000000000002';

-- Opening hours follow the timetable (private hire can be arranged outside them, case by case).
update public.studio_settings set
  opening_hours = 'Mon–Sat 8:30–15:00, Sun 8:30–11:30',
  opening_hours_vi = 'Thứ Hai–Thứ Bảy 8:30–15:00, Chủ Nhật 8:30–11:30';

-- The old sample sessions from 16 Nov on: deleted, or cancelled where a test booking sits on them (staging only).
-- Private hire is left alone.
update public.sessions s set status = 'cancelled'
where s.starts_at >= '2026-11-16 00:00+07' and s.status = 'scheduled'
  and s.session_type_id <> '00000000-0000-4000-8000-000000000003'
  and exists (select 1 from public.bookings b where b.session_id = s.id);
delete from public.sessions s
where s.starts_at >= '2026-11-16 00:00+07'
  and s.session_type_id <> '00000000-0000-4000-8000-000000000003'
  and not exists (select 1 from public.bookings b where b.session_id = s.id)
  and not exists (select 1 from public.payments p where p.session_id = s.id);

-- The weekly timetable (isodow: 1 = Monday ... 7 = Sunday).
with week (dow, starts, minutes, type_id, title) as (values
  (1, '08:30', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (2, '08:30', 60, '00000000-0000-4000-8000-000000000005', 'Little Yogi & Me'),
  (3, '08:30', 60, '00000000-0000-4000-8000-000000000007', 'Breathe & Unwind'),
  (4, '08:30', 60, '00000000-0000-4000-8000-000000000008', 'Bump & Breathe'),
  (5, '08:30', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (6, '08:30', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (7, '08:30', 60, '00000000-0000-4000-8000-000000000006', 'Wiggle & Wonder'),
  (1, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (2, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (3, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (4, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (5, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (6, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (7, '09:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (1, '13:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (2, '13:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (3, '13:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (4, '13:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (5, '13:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (6, '13:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play')
)
insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity)
select w.type_id::uuid, w.title,
       (d::date + w.starts::time) at time zone 'Asia/Ho_Chi_Minh',
       (d::date + w.starts::time) at time zone 'Asia/Ho_Chi_Minh' + make_interval(mins => w.minutes),
       10
from generate_series('2026-11-16'::date, '2027-02-28'::date, interval '1 day') d
join week w on w.dow = extract(isodow from d);

commit;
