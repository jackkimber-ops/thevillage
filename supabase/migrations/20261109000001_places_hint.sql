-- Places left (team feedback 9 Nov): "8 of 10 places left" made classes look quiet. Customers now see
-- nothing about places until few are left: "Only 3 places left" / "Last place!" for classes, "Almost full"
-- (no number) for Open Play, then "Full". The cut-off is a studio setting (3; 0 = never show). Staff screens
-- keep exact counts (staff_timetable). Above the cut-off the count isn't even sent to the customer site.

alter table public.studio_settings
  add column places_hint_at int not null default 3 check (places_hint_at between 0 and 50);

drop function public.timetable(timestamptz, timestamptz);
create function public.timetable(p_from timestamptz, p_to timestamptz)
returns table (
  session_id uuid,
  session_type_id uuid,
  kind public.session_kind,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  instructor_name text,
  price_vnd bigint,
  capacity int,
  places_left int,     -- classes only, and only when few are left (studio setting); otherwise null
  is_full boolean,
  type_name text,
  type_colour text,
  type_picture_url text,
  almost_full boolean  -- few places left, not full (shown without a number for Open Play)
)
language sql stable security definer
set search_path = ''
as $$
  with s as (
    select s.*, st.kind, st.name, st.colour, st.picture_url, st.drop_in_price_vnd, sr.display_name,
           case when s.capacity is null then null else greatest(s.capacity - public.places_taken(s.id), 0) end as left_n,
           (select places_hint_at from public.studio_settings) as hint_at
    from public.sessions s
    join public.session_types st on st.id = s.session_type_id
    left join public.staff_roles sr on sr.user_id = s.instructor_id
    where s.status = 'scheduled' and s.starts_at >= p_from and s.starts_at < p_to
      and p_to - p_from <= interval '62 days'
  )
  select s.id, s.session_type_id, s.kind, s.title, s.starts_at, s.ends_at, s.display_name,
         coalesce(s.price_vnd, s.drop_in_price_vnd), s.capacity,
         case when s.kind <> 'open_play' and s.left_n between 1 and s.hint_at then s.left_n end,
         s.left_n = 0,
         s.name, s.colour, s.picture_url,
         coalesce(s.left_n between 1 and s.hint_at, false)
  from s
  order by s.starts_at
$$;
revoke execute on function public.timetable(timestamptz, timestamptz) from public;
grant execute on function public.timetable(timestamptz, timestamptz) to anon, authenticated;

-- Settings: the cut-off is editable (Settings, booking rules).
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
    updated_at = now();

  perform public.audit('change_settings', 'studio_settings', 'studio', to_jsonb(v_before),
    (select to_jsonb(s) from public.studio_settings s));
exception
  when invalid_datetime_format or invalid_text_representation or datetime_field_overflow or not_null_violation then
    perform public.fail('invalid_setting');
end;
$$;

