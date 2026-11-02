-- Team feedback 2 Nov.
-- 1) Opening hours in Vietnamese too (the Vietnamese pages and emails showed the English line).
-- 2) Private hire can run from an hour to a full day (8:30-17:00 is 510 minutes), so a session may be up to 10 hours.
-- 3) Private hire groups of up to 15 people, shown on the hire page.

alter table public.studio_settings add column opening_hours_vi text;
update public.studio_settings set opening_hours_vi = 'Mở cửa mỗi ngày 8:30–17:00' where opening_hours_vi is null;
alter table public.studio_settings alter column opening_hours_vi set not null;

alter table public.studio_settings add column hire_max_group int not null default 15 check (hire_max_group > 0);

create or replace function public.create_sessions(
  p_session_type_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_minutes int,
  p_capacity int,
  p_instructor_id uuid,
  p_repeat_until date default null,
  p_price_vnd bigint default null,
  p_notes text default null,
  p_hire_customer_id uuid default null
) returns uuid[]
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := '{}';
  v_start timestamptz := p_starts_at;
  v_id uuid;
begin
  if not public.is_manager() and not (public.is_staff() and p_instructor_id = auth.uid()) then
    perform public.fail('not_allowed');
  end if;
  if p_minutes not between 15 and 600 then perform public.fail('invalid_length'); end if;
  if p_repeat_until is not null and p_repeat_until > public.vn_date(p_starts_at) + 366 then perform public.fail('repeat_too_long'); end if;
  loop
    begin
      insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity, instructor_id, price_vnd, notes, hire_customer_id, created_by)
      values (p_session_type_id, trim(p_title), v_start, v_start + make_interval(mins => p_minutes), p_capacity, p_instructor_id,
              p_price_vnd, p_notes, p_hire_customer_id, auth.uid())
      returning id into v_id;
    exception when exclusion_violation then
      raise exception 'overlap:%', public.vn_date(v_start) using errcode = 'P0001';
    end;
    v_ids := v_ids || v_id;
    v_start := v_start + interval '7 days';
    exit when p_repeat_until is null or public.vn_date(v_start) > p_repeat_until;
  end loop;
  return v_ids;
end;
$$;

-- The private hire description still said "1 or 2 hours" (only where it hasn't been edited since).
update public.session_types
  set description = 'Hire the whole studio, from an hour to a full day. Arranged by message.'
  where id = '00000000-0000-4000-8000-000000000003'
    and description = 'Hire the whole studio for 1 or 2 hours. Arranged by message.';
