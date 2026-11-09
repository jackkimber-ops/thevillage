-- The final agreed November schedule (Jack, 7 Nov), from launch (Mon 16 Nov) to Mon 30 Nov:
--   Mon-Fri and Sun: a class 9:00-10:00, then Open Play 10:00-12:00 (unchanged from 3 Nov)
--   Saturday: Open Play 8:30-10:30, then Core & Cuddle 10:30-11:30 (changed)
-- Nothing is agreed from 1 December, so those sessions are removed.
-- No bookings sat on any session changed or removed (checked first, staging and production). If there ever
-- are, move them with update_session or cancel them with cancel_session so people are told.

begin;

update public.studio_settings set
  opening_hours = 'Mon–Fri & Sun 9:00–12:00, Sat 8:30–11:30',
  opening_hours_vi = 'Thứ Hai–Thứ Sáu & Chủ Nhật 9:00–12:00, Thứ Bảy 8:30–11:30';

-- Saturdays: the old 9:00 class and 10:00 Open Play go...
delete from public.sessions s
where s.status = 'scheduled' and s.starts_at >= '2026-11-16 00:00+07' and s.starts_at < '2026-12-01 00:00+07'
  and extract(isodow from s.starts_at at time zone 'Asia/Ho_Chi_Minh') = 6
  and s.session_type_id <> '00000000-0000-4000-8000-000000000003'
  and not exists (select 1 from public.bookings b where b.session_id = s.id)
  and not exists (select 1 from public.payments p where p.session_id = s.id);

-- ...and everything from 1 December.
delete from public.sessions s
where s.starts_at >= '2026-12-01 00:00+07'
  and s.session_type_id <> '00000000-0000-4000-8000-000000000003'
  and not exists (select 1 from public.bookings b where b.session_id = s.id)
  and not exists (select 1 from public.payments p where p.session_id = s.id);

-- Saturdays 21 and 28 Nov, new times. Phuong teaches Core & Cuddle.
insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
select t.type_id::uuid, t.title, (d + t.starts::time) at time zone 'Asia/Ho_Chi_Minh',
       (d + t.starts::time) at time zone 'Asia/Ho_Chi_Minh' + make_interval(mins => t.minutes), 10,
       case when t.type_id = '00000000-0000-4000-8000-000000000004'
            then (select u.id from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = 'ph.nguyen4787@gmail.com')
       end
from (values (date '2026-11-21'), (date '2026-11-28')) days(d)
cross join (values
  ('08:30', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  ('10:30', 60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle')
) t(starts, minutes, type_id, title);

commit;
