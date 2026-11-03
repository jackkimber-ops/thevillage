-- M9 Studio settings page (brought forward from the +1 month release, 3 Nov): managers change the studio's
-- details, contact and messaging links, and the booking rules, without a developer. One function checks
-- every value and records the change in the audit log. (Children/parents per booking and the reminder time
-- stay fixed: the reminder job's schedule doesn't read the setting.)

create function public.manager_save_settings(p jsonb) returns void
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
    updated_at = now();

  perform public.audit('change_settings', 'studio_settings', 'studio', to_jsonb(v_before),
    (select to_jsonb(s) from public.studio_settings s));
exception
  when invalid_datetime_format or invalid_text_representation or datetime_field_overflow or not_null_violation then
    perform public.fail('invalid_setting');
end;
$$;

revoke execute on function public.manager_save_settings(jsonb) from public, anon, authenticated;
grant execute on function public.manager_save_settings(jsonb) to authenticated;
