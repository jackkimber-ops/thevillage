-- Daily summary to the studio (Jack, 17 Nov; change #51). At 21:05 Vietnam time, after the 21:00 cancellation
-- cut-off, one email to the alert address (hello@): today's bookings and cancellations, and tomorrow's sessions with
-- who is booked (final by then: nobody can cancel online after 21:00). Sent every day, even a quiet one, so a
-- missing email means something is wrong. The every-booking emails (change #50) carry on as well.

-- The new email kind is added in 20261117000003 (a new enum value must be committed before it is used).

alter table public.notifications drop constraint notifications_about_someone,
  add constraint notifications_about_someone
    check (booking_id is not null or customer_id is not null or staff_user_id is not null or kind = 'daily_summary');

create function public.queue_daily_summary() returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_day date := public.vn_date(now());
  v_activity jsonb;
  v_tomorrow jsonb;
  v_n int;
begin
  -- Today's bookings made and cancelled (Vietnam date), oldest first.
  select coalesce(jsonb_agg(x order by x.at), '[]') into v_activity from (
    select ev.at, ev.event, c.full_name, s.title, s.starts_at,
           coalesce((select array_agg(k.name order by k.name) from public.booking_children bc
                     join public.customer_children k on k.id = bc.child_id where bc.booking_id = b.id), '{}') as children,
           b.customer_pack_id is not null as on_pack, b.unpaid and b.paid_at is null as unpaid, b.free_trial,
           b.amount_due_vnd, b.first_booking, b.source, r.display_name as by
    from (
      select b.created_at as at, 'booked'::text as event, b.id, b.created_by as who from public.bookings b
      where public.vn_date(b.created_at) = v_day
      union all
      select b.cancelled_at, b.status::text, b.id, b.cancelled_by from public.bookings b
      where b.cancelled_at is not null and public.vn_date(b.cancelled_at) = v_day and b.status in ('cancelled', 'late_cancelled')
    ) ev
    join public.bookings b on b.id = ev.id
    join public.customers c on c.id = b.customer_id
    join public.sessions s on s.id = b.session_id
    left join public.staff_roles r on r.user_id = ev.who
  ) x;

  -- Tomorrow's sessions (not cancelled), with who is booked.
  select coalesce(jsonb_agg(x order by x.starts_at), '[]') into v_tomorrow from (
    select s.id, s.title, s.starts_at, st.kind, s.capacity, public.places_taken(s.id) as taken,
           (select display_name from public.staff_roles i where i.user_id = s.instructor_id) as instructor,
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'name', c.full_name,
                      'children', coalesce((select array_agg(k.name order by k.name) from public.booking_children bc
                                            join public.customer_children k on k.id = bc.child_id where bc.booking_id = b.id), '{}'),
                      'unnamed', greatest(b.children - (select count(*) from public.booking_children bc where bc.booking_id = b.id), 0),
                      'on_pack', b.customer_pack_id is not null, 'unpaid', b.unpaid and b.paid_at is null,
                      'amount_due_vnd', b.amount_due_vnd, 'free_trial', b.free_trial, 'first', b.first_booking)
                    order by b.created_at)
             from public.bookings b join public.customers c on c.id = b.customer_id
             where b.session_id = s.id and b.status = 'booked'), '[]') as people
    from public.sessions s
    join public.session_types st on st.id = s.session_type_id
    where s.status = 'scheduled' and public.vn_date(s.starts_at) = v_day + 1
  ) x;

  insert into public.notifications (kind, dedupe_key, payload)
  values ('daily_summary', 'summary:' || v_day, jsonb_build_object('day', v_day, 'activity', v_activity, 'tomorrow', v_tomorrow))
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count;
  insert into public.job_runs (job, ok, detail) values ('queue_daily_summary', true, jsonb_build_object('day', v_day, 'queued', v_n));
  return v_n;
end;
$$;
revoke execute on function public.queue_daily_summary() from public, anon, authenticated;

-- The sender: the summary has no customer, so it is never skipped as "no email".
drop function public.claim_notifications(int);
create function public.claim_notifications(p_limit int default 25)
returns table (
  id bigint,
  kind public.notification_kind,
  payload jsonb,
  email text,
  language public.app_language,
  first_name text,
  session_title text,
  session_kind public.session_kind,
  starts_at timestamptz,
  ends_at timestamptz,
  child_names text[],
  parents int,
  credits int,
  pack_name text,
  unpaid boolean,
  amount_due_vnd bigint,
  free_trial boolean,
  cancel_cutoff timestamptz,
  booking_id uuid,
  customer_id uuid,
  full_name text,
  phone text,
  preferred_contact public.contact_method,
  staff_email text,
  staff_name text
)
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Nobody to send to (no email, or anonymised): skip. Studio alerts and instructor emails go to staff.
  update public.notifications n set status = 'skipped', last_error = 'no email'
  from public.customers c
  where c.id = coalesce(n.customer_id, (select b.customer_id from public.bookings b where b.id = n.booking_id))
    and n.status = 'pending' and n.kind not in ('staff_alert', 'instructor_session_moved', 'low_signups', 'daily_summary')
    and (c.email is null or c.anonymised_at is not null);

  return query
  with claimed as (
    select n.id from public.notifications n
    where ((n.status = 'pending' and n.send_after <= now())
           or (n.status = 'sending' and n.created_at < now() - interval '10 minutes'))
      and n.attempts < 5
    order by n.send_after, n.created_at
    limit p_limit
    for update skip locked
  ), marked as (
    update public.notifications n set status = 'sending', attempts = n.attempts + 1
    from claimed where n.id = claimed.id
    returning n.*
  )
  select m.id, m.kind, m.payload, c.email, c.language, split_part(c.full_name, ' ', 1), s.title, st.kind, s.starts_at, s.ends_at,
         coalesce((select array_agg(k.name order by k.name) from public.booking_children bc join public.customer_children k on k.id = bc.child_id where bc.booking_id = b.id), '{}'),
         b.parents, b.credits, cp.name, b.unpaid and b.paid_at is null, b.amount_due_vnd, b.free_trial,
         public.cancel_cutoff(s.starts_at), b.id, c.id, c.full_name, c.phone, c.preferred_contact,
         su.email::text, sr.display_name
  from marked m
  left join public.bookings b on b.id = m.booking_id
  left join public.customers c on c.id = coalesce(m.customer_id, b.customer_id)
  left join public.sessions s on s.id = coalesce(b.session_id, (m.payload ->> 'session_id')::uuid)
  left join public.session_types st on st.id = s.session_type_id
  left join public.customer_packs cp on cp.id = b.customer_pack_id
  left join auth.users su on su.id = m.staff_user_id
  left join public.staff_roles sr on sr.user_id = m.staff_user_id;
end;
$$;
revoke execute on function public.claim_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_notifications(int) to service_role;

-- 21:05 Vietnam time = 14:05 UTC.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('daily-summary', '5 14 * * *', 'select public.queue_daily_summary()');
  end if;
end;
$$;
