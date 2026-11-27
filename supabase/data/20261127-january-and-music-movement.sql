-- January 2027 on the December pattern (Jack, 27 Nov: "update January same as December"), plus Music & Movement's
-- description and badge. Run AFTER 20261127-december-schedule.sql (it needs Music & Movement and the 1 Jan closure).
--   Mon & Fri Core & Cuddle 9:00 then Open Play 10:00; Tue Little Yogi & Me 9:00 then Open Play; Wed Open Play 9:00-12:00;
--   Thu Bump & Breathe 9:00 then Open Play; Sat Music & Movement 8:30-10:30 then Core & Cuddle 10:30;
--   Sun Wiggle & Wonder 8:30-10:30 then Little Yogi & Me 10:30.
-- Fri 1 Jan is closed (New Year's Day). Tet dates are to come from the owners: add them under Settings, closures, which
-- cancels anything already on those days and tells people booked. Sat 2 Jan to Sun 31 Jan: 56 sessions.
-- Music & Movement takes over Breathe & Unwind's badge (Breathe & Unwind isn't on the timetable any more).
-- Applied once to staging, then production. Not safe to run twice (it would add the January sessions again).

begin;

-- Music & Movement: a first, generic description (English by me, Vietnamese a draft) until the owners send their own.
update public.session_types set
  tagline = 'Sing, sway & explore together.',
  description = 'A joyful baby class where music leads the way. Through songs, rhythm, gentle movement and sensory play, babies explore sound and motion while you connect with your little one and meet other families. No experience needed: little ones are free to join in at their own pace.',
  tagline_vi = 'Cùng hát, cùng lắc lư, cùng khám phá.',
  description_vi = 'Lớp học vui nhộn dành cho bé, nơi âm nhạc dẫn lối. Thông qua các bài hát, nhịp điệu, vận động nhẹ nhàng và trò chơi cảm giác, bé khám phá âm thanh và chuyển động, còn bố mẹ có thêm thời gian gắn kết với con và làm quen với các gia đình khác. Không cần kinh nghiệm: bé được tự do tham gia theo nhịp độ của riêng mình.',
  picture_url = '/brand/badges/music-movement.png'
where id = '00000000-0000-4000-8000-000000000010';

-- Breathe & Unwind gives its badge up (it can still be put back on the calendar; it then shows the house badge).
update public.session_types set picture_url = null where id = '00000000-0000-4000-8000-000000000007';

insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id)
select t.type_id::uuid, t.title,
       (g.d + t.starts::time) at time zone 'Asia/Ho_Chi_Minh',
       (g.d + t.starts::time) at time zone 'Asia/Ho_Chi_Minh' + make_interval(mins => t.minutes), 10,
       case when t.type_id = '00000000-0000-4000-8000-000000000004'
            then (select u.id from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = 'ph.nguyen4787@gmail.com')
       end
from (select d::date as d from generate_series(timestamp '2027-01-01', timestamp '2027-01-31', interval '1 day') s(d)) g
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
