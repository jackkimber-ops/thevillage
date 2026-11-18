-- Minimum sign-ups email goes to the studio address (Jack, 18 Nov; change #59).
-- Before: each manager got their own copy at their personal login address. Now managers get one shared email at the
-- studio alert address (hello@), like the booking alerts and the daily summary. Instructors still get their own
-- classes at their own address. Nothing else changes (19:00, classes only, nothing cancelled automatically).

alter table public.notifications drop constraint notifications_about_someone,
  add constraint notifications_about_someone
    check (booking_id is not null or customer_id is not null or staff_user_id is not null or kind in ('daily_summary', 'low_signups'));

create or replace function public.queue_low_signup_alerts() returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_min int := (public.settings()).min_signups;
  v_day date := public.vn_date(now()) + 1;
  v_queued int := 0;
  v_all jsonb;
  v_person record;
begin
  if v_min > 0 then
    create temporary table _low on commit drop as
      select s.id, s.title, s.starts_at, s.instructor_id, s.capacity, public.places_taken(s.id) as booked
      from public.sessions s
      join public.session_types st on st.id = s.session_type_id
      where st.kind = 'class' and s.status = 'scheduled' and public.vn_date(s.starts_at) = v_day
        and public.places_taken(s.id) < v_min;

    -- One shared email for the studio (managers).
    select jsonb_agg(jsonb_build_object('title', b.title, 'starts_at', b.starts_at, 'booked', b.booked,
                                        'capacity', b.capacity, 'session_id', b.id,
                                        'instructor', (select display_name from public.staff_roles i where i.user_id = b.instructor_id))
                     order by b.starts_at)
      into v_all from _low b;
    if v_all is not null then
      insert into public.notifications (kind, dedupe_key, payload)
      values ('low_signups', 'low:' || v_day || ':studio', jsonb_build_object('day', v_day, 'min', v_min, 'classes', v_all, 'studio', true))
      on conflict (dedupe_key) do nothing;
      if found then v_queued := v_queued + 1; end if;
    end if;

    -- Each instructor: their own classes, at their own address.
    for v_person in
      select r.user_id,
             jsonb_agg(jsonb_build_object('title', b.title, 'starts_at', b.starts_at, 'booked', b.booked,
                                          'capacity', b.capacity, 'session_id', b.id,
                                          'instructor', r.display_name)
                       order by b.starts_at) as classes
      from public.staff_roles r
      join _low b on b.instructor_id = r.user_id
      where r.active
      group by r.user_id
    loop
      insert into public.notifications (kind, dedupe_key, staff_user_id, payload)
      values ('low_signups', 'low:' || v_day || ':' || v_person.user_id, v_person.user_id,
              jsonb_build_object('day', v_day, 'min', v_min, 'classes', v_person.classes))
      on conflict (dedupe_key) do nothing;
      if found then v_queued := v_queued + 1; end if;
    end loop;
    drop table _low;
  end if;
  insert into public.job_runs (job, ok, detail) values ('queue_low_signup_alerts', true, jsonb_build_object('queued', v_queued, 'day', v_day));
  return v_queued;
end;
$$;
revoke execute on function public.queue_low_signup_alerts() from public, anon, authenticated;
