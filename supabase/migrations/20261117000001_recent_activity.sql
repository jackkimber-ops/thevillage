-- Latest bookings on the dashboard (Jack, 17 Nov; change #49): two returning customers booked Friday's class with
-- credits and nothing showed on the dashboard (the get-in-touch list only has new customers and unpaid bookings).
-- Every booking made and every cancellation in the last few days, newest first, for staff. Instructors see only
-- customers they can see (as everywhere else).
create function public.recent_activity(p_days int default 7, p_limit int default 30)
returns table (
  at timestamptz,
  event text,                -- 'booked' | 'cancelled' | 'late_cancelled'
  booking_id uuid,
  customer_id uuid,
  full_name text,
  child_names text[],
  children int,
  parents int,
  session_id uuid,
  title text,
  starts_at timestamptz,
  kind public.session_kind,
  source public.booking_source,
  on_pack boolean,
  unpaid boolean,
  free_trial boolean,
  by_staff text              -- the staff member who made or cancelled it, if one did
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  return query
  with ev as (
    select b.created_at as at, 'booked'::text as event, b.id, b.created_by as who from public.bookings b
    where b.created_at > now() - make_interval(days => p_days)
    union all
    select b.cancelled_at, b.status::text, b.id, b.cancelled_by from public.bookings b
    where b.cancelled_at is not null and b.cancelled_at > now() - make_interval(days => p_days)
      and b.status in ('cancelled', 'late_cancelled')
  )
  select ev.at, ev.event, b.id, c.id, c.full_name,
         coalesce((select array_agg(k.name order by k.name) from public.booking_children bc
                   join public.customer_children k on k.id = bc.child_id where bc.booking_id = b.id), '{}'),
         b.children, b.parents, s.id, s.title, s.starts_at, st.kind, b.source,
         b.customer_pack_id is not null or b.credits > 0, b.unpaid and b.paid_at is null, b.free_trial,
         r.display_name
  from ev
  join public.bookings b on b.id = ev.id
  join public.customers c on c.id = b.customer_id
  join public.sessions s on s.id = b.session_id
  join public.session_types st on st.id = s.session_type_id
  left join public.staff_roles r on r.user_id = ev.who
  where public.staff_can_see_customer(c.id)
  order by ev.at desc, (ev.event <> 'booked') desc
  limit greatest(1, least(p_limit, 100));
end;
$$;
revoke execute on function public.recent_activity(int, int) from public, anon, authenticated;
grant execute on function public.recent_activity(int, int) to authenticated;
