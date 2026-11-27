-- The December schedule (the owners' graphic, sent by Jack 27 Nov), Tue 1 Dec to Thu 31 Dec, and the two closed days.
--   Mon: Core & Cuddle 9:00-10:00, Open Play 10:00-12:00
--   Tue: Little Yogi & Me 9:00-10:00, Open Play 10:00-12:00
--   Wed: Open Play 9:00-12:00
--   Thu: Bump & Breathe 9:00-10:00, Open Play 10:00-12:00
--   Fri: Core & Cuddle 9:00-10:00, Open Play 10:00-12:00
--   Sat: Music & Movement (baby class, age 0-3) 8:30-10:30, Core & Cuddle 10:30-11:30
--   Sun: Wiggle & Wonder (toddler class, age 18 months-3) 8:30-10:30, Little Yogi & Me 10:30-11:30
-- Closed on Christmas Day (Fri 25 Dec) and New Year's Day (Fri 1 Jan 2027): no sessions are loaded on those days and
-- the closures stop any being added. Packs are NOT extended for them (a manager can extend from the customer page).
-- Phuong teaches every Core & Cuddle. Other classes have no instructor yet.
-- Applied once to staging, then production. Not safe to run twice (it would add the December sessions again).

begin;

-- New class type: Music & Movement. Description and badge picture to come from the owners.
insert into public.session_types (id, kind, name, colour, default_minutes, default_capacity, drop_in_price_vnd, suits, suits_vi)
values ('00000000-0000-4000-8000-000000000010', 'class', 'Music & Movement', '#FFBEA1', 120, 10, 450000,
        'Babies, 0 to 3 years', 'Bé từ 0 đến 3 tuổi')
on conflict (id) do nothing;
insert into public.pack_type_covers (pack_type_id, session_type_id)
select p.id, '00000000-0000-4000-8000-000000000010'::uuid from public.pack_types p
where p.id in ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103')
on conflict do nothing;

-- Ages from the schedule graphic.
update public.session_types set suits = 'Toddlers, 18 months to 3 years', suits_vi = 'Bé từ 18 tháng đến 3 tuổi'
where id = '00000000-0000-4000-8000-000000000006'; -- Wiggle & Wonder

-- Closed days (managers can reopen them from Settings, closures).
insert into public.closures (starts_on, ends_on, reason)
select d, d, r from (values (date '2026-12-25', 'Christmas Day'), (date '2027-01-01', 'New Year''s Day')) c(d, r)
where not exists (select 1 from public.closures x where x.starts_on = c.d);
select public.audit('add_closure', 'closures', c.id::text, null, jsonb_build_object('from', c.starts_on, 'to', c.ends_on, 'reason', c.reason, 'sessions', 0, 'bookings', 0, 'packs', 0))
from public.closures c where c.starts_on in (date '2026-12-25', date '2027-01-01');

insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
select t.type_id::uuid, t.title,
       (g.d + t.starts::time) at time zone 'Asia/Ho_Chi_Minh',
       (g.d + t.starts::time) at time zone 'Asia/Ho_Chi_Minh' + make_interval(mins => t.minutes), 10,
       case when t.type_id = '00000000-0000-4000-8000-000000000004'
            then (select u.id from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = 'ph.nguyen4787@gmail.com')
       end
from (select d::date as d from generate_series(timestamp '2026-12-01', timestamp '2026-12-31', interval '1 day') s(d)) g
join (values
  (1, '09:00',  60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (1, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (2, '09:00',  60, '00000000-0000-4000-8000-000000000005', 'Little Yogi & Me'),
  (2, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (3, '09:00', 180, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (4, '09:00',  60, '00000000-0000-4000-8000-000000000008', 'Bump & Breathe'),
  (4, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (5, '09:00',  60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (5, '10:00', 120, '00000000-0000-4000-8000-000000000002', 'Open Play'),
  (6, '08:30', 120, '00000000-0000-4000-8000-000000000010', 'Music & Movement'),
  (6, '10:30',  60, '00000000-0000-4000-8000-000000000004', 'Core & Cuddle'),
  (7, '08:30', 120, '00000000-0000-4000-8000-000000000006', 'Wiggle & Wonder'),
  (7, '10:30',  60, '00000000-0000-4000-8000-000000000005', 'Little Yogi & Me')
) t(dow, starts, minutes, type_id, title) on extract(isodow from g.d) = t.dow
where not exists (select 1 from public.closures c where g.d between c.starts_on and c.ends_on);

commit;
