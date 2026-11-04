-- Team feedback, 4 Nov.
-- 1) A child's birth month can't be in the future (the month picker offered years up to 2099). One rule here covers
--    every form: guest booking, first-time details, booking with a new child, staff add customer and children.
-- 2) A session can only be cancelled after its bookings are (cancel_session does that, and emails everyone).
--    A shortcut that just marked the session cancelled left bookings showing in My bookings (Claude's timetable
--    reload on the test site, 3 Nov).

create function public.children_not_born_in_future() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_month > date_trunc('month', public.vn_date(now()))::date then
    perform public.fail('child_born_in_future');
  end if;
  return new;
end;
$$;
create trigger children_not_born_in_future before insert or update of birth_month on public.customer_children
  for each row execute function public.children_not_born_in_future();

create function public.sessions_cancelled_without_bookings() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled'
     and exists (select 1 from public.bookings where session_id = new.id and status = 'booked') then
    perform public.fail('session_has_bookings');
  end if;
  return new;
end;
$$;
create trigger sessions_cancelled_without_bookings before update of status on public.sessions
  for each row execute function public.sessions_cancelled_without_bookings();
