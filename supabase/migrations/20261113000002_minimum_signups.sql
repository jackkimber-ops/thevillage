-- Minimum sign-ups (owners, 13 Nov; change #44). Classes need a minimum number booked (2 to start, maybe 3 later:
-- a studio setting, 0 = off). At 19:00 Vietnam time the evening before, one email goes to each active manager and
-- to each instructor (their own classes only), listing tomorrow's classes below the minimum. Nothing is cancelled
-- automatically: staff decide, and cancel with "Cancel session for everyone" (which emails everyone booked).
-- Classes only (not Open Play).

alter type public.notification_kind add value if not exists 'low_signups';

alter table public.studio_settings
  add column min_signups int not null default 2 check (min_signups between 0 and 50);

-- Tomorrow's classes below the minimum, per person to tell. Safe to run twice (one email per person per day).
create function public.queue_low_signup_alerts() returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_min int := (public.settings()).min_signups;
  v_day date := public.vn_date(now()) + 1;
  v_queued int := 0;
  v_person record;
begin
  if v_min > 0 then
    for v_person in
      with low as (
        select s.id, s.title, s.starts_at, s.instructor_id, s.capacity, public.places_taken(s.id) as booked
        from public.sessions s
        join public.session_types st on st.id = s.session_type_id
        where st.kind = 'class' and s.status = 'scheduled' and public.vn_date(s.starts_at) = v_day
      ), below as (select * from low where booked < v_min)
      select r.user_id,
             jsonb_agg(jsonb_build_object('title', b.title, 'starts_at', b.starts_at, 'booked', b.booked,
                                          'capacity', b.capacity, 'session_id', b.id,
                                          'instructor', (select display_name from public.staff_roles i where i.user_id = b.instructor_id))
                       order by b.starts_at) as classes
      from public.staff_roles r
      join below b on r.role = 'manager' or b.instructor_id = r.user_id
      where r.active
      group by r.user_id
    loop
      insert into public.notifications (kind, dedupe_key, staff_user_id, payload)
      values ('low_signups', 'low:' || v_day || ':' || v_person.user_id, v_person.user_id,
              jsonb_build_object('day', v_day, 'min', v_min, 'classes', v_person.classes))
      on conflict (dedupe_key) do nothing;
      if found then v_queued := v_queued + 1; end if;
    end loop;
  end if;
  insert into public.job_runs (job, ok, detail) values ('queue_low_signup_alerts', true, jsonb_build_object('queued', v_queued, 'day', v_day));
  return v_queued;
end;
$$;
revoke execute on function public.queue_low_signup_alerts() from public, anon, authenticated;

-- Settings: the minimum is editable by managers (Settings, booking rules).
create or replace function public.manager_save_settings(p jsonb) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_before public.studio_settings;
  v_window interval;
  v_latest interval;
  v_url text;
  v_key text;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  select * into v_before from public.studio_settings for update;

  if coalesce(trim(p ->> 'name'), '') = '' or coalesce(trim(p ->> 'address'), '') = ''
     or coalesce(trim(p ->> 'opening_hours'), '') = '' or coalesce(trim(p ->> 'opening_hours_vi'), '') = '' then
    perform public.fail('settings_required');
  end if;
  if (p ->> 'contact_email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.fail('invalid_email'); end if;
  if coalesce(p ->> 'alert_email', '') <> '' and (p ->> 'alert_email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.fail('invalid_email'); end if;
  if (p ->> 'contact_phone') !~ '^\+[1-9][0-9]{7,14}$' then perform public.fail('invalid_phone'); end if;
  foreach v_key in array array['whatsapp_url', 'zalo_url', 'messenger_url', 'facebook_url', 'instagram_url', 'maps_url'] loop
    v_url := nullif(trim(coalesce(p ->> v_key, '')), '');
    if v_url is not null and v_url !~ '^https://[^\s]+$' then perform public.fail('invalid_link'); end if;
  end loop;

  -- Booking rules, within sensible limits.
  v_window := (p ->> 'booking_window')::interval;
  v_latest := (p ->> 'latest_booking')::interval;
  if v_window < interval '1 day' or v_window > interval '6 months' then perform public.fail('invalid_booking_window'); end if;
  if v_latest < interval '0' or v_latest > interval '2 days' then perform public.fail('invalid_latest_booking'); end if;
  if (p ->> 'hire_max_group')::int not between 1 and 200 then perform public.fail('invalid_group'); end if;
  if (p ->> 'places_hint_at')::int not between 0 and 50 then perform public.fail('invalid_places_hint'); end if;
  if p ? 'min_signups' and (p ->> 'min_signups')::int not between 0 and 50 then perform public.fail('invalid_min_signups'); end if;

  update public.studio_settings set
    name = trim(p ->> 'name'),
    address = trim(p ->> 'address'),
    opening_hours = trim(p ->> 'opening_hours'),
    opening_hours_vi = trim(p ->> 'opening_hours_vi'),
    contact_email = lower(trim(p ->> 'contact_email')),
    contact_phone = p ->> 'contact_phone',
    alert_email = nullif(lower(trim(coalesce(p ->> 'alert_email', ''))), ''),
    whatsapp_url = nullif(trim(coalesce(p ->> 'whatsapp_url', '')), ''),
    zalo_url = nullif(trim(coalesce(p ->> 'zalo_url', '')), ''),
    messenger_url = nullif(trim(coalesce(p ->> 'messenger_url', '')), ''),
    facebook_url = nullif(trim(coalesce(p ->> 'facebook_url', '')), ''),
    instagram_url = nullif(trim(coalesce(p ->> 'instagram_url', '')), ''),
    maps_url = nullif(trim(coalesce(p ->> 'maps_url', '')), ''),
    cancel_cutoff_time = (p ->> 'cancel_cutoff_time')::time,
    booking_window = v_window,
    latest_booking = v_latest,
    hire_max_group = (p ->> 'hire_max_group')::int,
    places_hint_at = (p ->> 'places_hint_at')::int,
    min_signups = coalesce((p ->> 'min_signups')::int, min_signups), -- missing: keep (an older app version)
    updated_at = now();

  perform public.audit('change_settings', 'studio_settings', 'studio', to_jsonb(v_before),
    (select to_jsonb(s) from public.studio_settings s));
exception
  when invalid_datetime_format or invalid_text_representation or datetime_field_overflow or not_null_violation then
    perform public.fail('invalid_setting');
end;
$$;

-- The sender skips customer emails with no address; low_signups go to staff like instructor emails.
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
    and n.status = 'pending' and n.kind not in ('staff_alert', 'instructor_session_moved', 'low_signups')
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

-- 19:00 Vietnam time = 12:00 UTC.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('low-signups', '0 12 * * *', 'select public.queue_low_signup_alerts()');
  end if;
end;
$$;
