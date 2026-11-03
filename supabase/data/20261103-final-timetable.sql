-- The owners' final schedule (Jack, 3 Nov), replacing the 2 Nov timetable from Mon 16 Nov to Sun 28 Feb 2027:
-- every day a class 9:00-10:00 and Open Play 10:00-12:00; no afternoon Open Play any more.
-- The Tue/Thu 15:30-16:30 children's classes (Yoga Storytelling 3-5 yrs, Yoga Adventure 6-10 yrs) start in December
-- and are NOT loaded here: they're children-only (no parents) with a price still to be decided.
-- Applied once to staging, then production. Phuong still teaches Core & Cuddle.

begin;

update public.studio_settings set
  opening_hours = 'Every day 9:00–12:00; Tue & Thu also 15:30–16:30 (from December)',
  opening_hours_vi = 'Mở cửa mỗi ngày 9:00–12:00; Thứ Ba & Thứ Năm thêm 15:30–16:30 (từ tháng 12)';

-- The 2 Nov sessions from 16 Nov on: deleted, or cancelled where a booking sits on them (staging test bookings).
update public.sessions s set status = 'cancelled'
where s.starts_at >= '2026-11-16 00:00+07' and s.status = 'scheduled'
  and s.session_type_id <> '00000000-0000-4000-8000-000000000003'
  and exists (select 1 from public.bookings b where b.session_id = s.id);
delete from public.sessions s
where s.starts_at >= '2026-11-16 00:00+07'
  and s.session_type_id <> '00000000-0000-4000-8000-000000000003'
  and not exists (select 1 from public.bookings b where b.session_id = s.id)
  and not exists (select 1 from public.payments p where p.session_id = s.id);

with week (dow, starts, minutes, type_id, title) as (values
  (1, '09:00', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (2, '09:00', 60, '00000000-0000-4000-8000-000000000005', 'Little Yogi & Me'),
  (3, '09:00', 60, '00000000-0000-4000-8000-000000000007', 'Breathe & Unwind'),
  (4, '09:00', 60, '00000000-0000-4000-8000-000000000008', 'Bump & Breathe'),
  (5, '09:00', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (6, '09:00', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (7, '09:00', 60, '00000000-0000-4000-8000-000000000006', 'Wiggle & Wonder'),
  (1, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (2, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (3, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (4, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (5, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (6, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (7, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play')
)
insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
select w.type_id::uuid, w.title,
       (d::date + w.starts::time) at time zone 'Asia/Ho_Chi_Minh',
       (d::date + w.starts::time) at time zone 'Asia/Ho_Chi_Minh' + make_interval(mins => w.minutes),
       10,
       case when w.type_id = '00000000-0000-4000-8000-000000000004'
            then (select u.id from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = 'ph.nguyen4787@gmail.com')
       end
from generate_series('2026-11-16'::date, '2027-02-28'::date, interval '1 day') d
join week w on w.dow = extract(isodow from d);

commit;
