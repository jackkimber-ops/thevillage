-- Staff app (stage 7): calendar with real counts, the get-in-touch list, customer search,
-- adding customers, creating and moving sessions, and cancelling a session for everyone.

-- Calendar and dashboard: every session (all types) with counts. Staff only.
create function public.staff_timetable(p_from timestamptz, p_to timestamptz)
returns table (
  session_id uuid,
  session_type_id uuid,
  kind public.session_kind,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.session_status,
  instructor_id uuid,
  instructor_name text,
  capacity int,
  taken int,
  unpaid int,
  hire_customer text,
  notes text
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  return query
  select s.id, s.session_type_id, st.kind, s.title, s.starts_at, s.ends_at, s.status, s.instructor_id, sr.display_name,
         s.capacity, public.places_taken(s.id),
         (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'booked' and b.unpaid and b.paid_at is null),
         c.full_name, s.notes
  from public.sessions s
  join public.session_types st on st.id = s.session_type_id
  left join public.staff_roles sr on sr.user_id = s.instructor_id
  left join public.customers c on c.id = s.hire_customer_id
  where s.starts_at >= p_from and s.starts_at < p_to and s.status <> 'cancelled'
    and p_to - p_from <= interval '62 days'
  order by s.starts_at;
end;
$$;

-- The get-in-touch list (S1): new customers and pay-on-the-day bookings not yet contacted.
create function public.contact_list()
returns table (
  booking_id uuid,
  customer_id uuid,
  full_name text,
  phone text,
  preferred_contact public.contact_method,
  first_booking boolean,
  unpaid boolean,
  amount_due_vnd bigint,
  source public.booking_source,
  free_trial boolean,
  children int,
  session_id uuid,
  title text,
  starts_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  return query
  select b.id, c.id, c.full_name, c.phone, c.preferred_contact, b.first_booking, b.unpaid, b.amount_due_vnd, b.source,
         b.free_trial, b.children, s.id, s.title, s.starts_at
  from public.bookings b
  join public.customers c on c.id = b.customer_id
  join public.sessions s on s.id = b.session_id
  where b.status = 'booked' and b.contacted_at is null and s.starts_at > now()
    and (b.first_booking or (b.unpaid and b.paid_at is null))
    and public.staff_can_see_customer(c.id)
  order by s.starts_at;
end;
$$;

-- Name, phone or email search when booking someone in (S13). Instructors may search everyone by name for this.
create function public.search_customers(p_query text)
returns table (customer_id uuid, full_name text, phone text, email text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_q text := lower(trim(p_query));
  v_digits text := regexp_replace(p_query, '\D', '', 'g');
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  if length(v_q) < 2 then return; end if;
  return query
  select c.id, c.full_name, c.phone, c.email
  from public.customers c
  where c.anonymised_at is null
    and (lower(c.full_name) like '%' || v_q || '%'
         or c.email like '%' || v_q || '%'
         or (length(v_digits) >= 3 and c.phone like '%' || v_digits || '%'))
  order by c.full_name
  limit 20;
end;
$$;

-- Staff add a customer (S14). Phone in +84 form, email lowercase; refuses duplicates.
create function public.staff_add_customer(
  p_full_name text,
  p_phone text,
  p_email text,
  p_preferred_contact public.contact_method,
  p_language public.app_language default 'en',
  p_children jsonb default '[]'
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_child jsonb;
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  if coalesce(trim(p_full_name), '') = '' then perform public.fail('name_required'); end if;
  if exists (select 1 from public.customers where phone = p_phone) then perform public.fail('phone_exists'); end if;
  if v_email is not null and exists (select 1 from public.customers where email = v_email) then perform public.fail('email_exists'); end if;
  insert into public.customers (full_name, phone, email, preferred_contact, language)
  values (trim(p_full_name), p_phone, v_email, p_preferred_contact, p_language)
  returning id into v_id;
  for v_child in select * from jsonb_array_elements(coalesce(p_children, '[]')) loop
    insert into public.customer_children (customer_id, name, birth_month)
    values (v_id, trim(v_child ->> 'name'), date_trunc('month', (v_child ->> 'birth_month')::date)::date);
  end loop;
  perform public.audit('add_customer', 'customers', v_id::text, null, jsonb_build_object('name', p_full_name));
  return v_id;
end;
$$;

-- Create a session, or the same session every week until a date (S3). All or nothing: refuses overlaps.
create function public.create_sessions(
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
  if p_minutes not between 15 and 480 then perform public.fail('invalid_length'); end if;
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

-- Edit a session (S3) or drag it to a new time (S2). Its bookings move with it.
create function public.update_session(
  p_session_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_minutes int,
  p_capacity int,
  p_instructor_id uuid,
  p_notes text default null
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then perform public.fail('session_not_found'); end if;
  if not public.is_manager() and not (public.is_staff() and v_session.instructor_id = auth.uid() and p_instructor_id = auth.uid()) then
    perform public.fail('not_allowed');
  end if;
  if v_session.status <> 'scheduled' then perform public.fail('session_closed'); end if;
  if p_capacity is not null and p_capacity < public.places_taken(p_session_id) then perform public.fail('capacity_below_booked'); end if;
  begin
    update public.sessions
      set title = trim(p_title), starts_at = p_starts_at, ends_at = p_starts_at + make_interval(mins => p_minutes),
          capacity = p_capacity, instructor_id = p_instructor_id, notes = p_notes
      where id = p_session_id;
  exception when exclusion_violation then
    perform public.fail('overlap');
  end;
  if v_session.starts_at <> p_starts_at then
    perform public.audit('move_session', 'sessions', p_session_id::text,
      jsonb_build_object('starts_at', v_session.starts_at), jsonb_build_object('starts_at', p_starts_at));
  end if;
end;
$$;

-- Cancel a session for everyone (illness, floods…): bookings cancelled, credits returned.
create function public.cancel_session(p_session_id uuid, p_reason text) returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_count int := 0;
  v_b public.bookings;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'scheduled' then perform public.fail('session_not_found'); end if;
  for v_b in select * from public.bookings where session_id = p_session_id and status = 'booked' for update loop
    update public.bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = p_reason
      where id = v_b.id;
    if v_b.customer_pack_id is not null then
      insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
      values (v_b.customer_pack_id, v_b.customer_id, v_b.id, 'return', v_b.credits, 'Session cancelled: ' || p_reason, auth.uid());
    end if;
    v_count := v_count + 1;
  end loop;
  update public.sessions set status = 'cancelled' where id = p_session_id;
  perform public.audit('cancel_session', 'sessions', p_session_id::text, null, jsonb_build_object('reason', p_reason, 'bookings', v_count));
  return v_count;
end;
$$;

revoke execute on function
  public.staff_timetable(timestamptz, timestamptz), public.contact_list(), public.search_customers(text),
  public.staff_add_customer(text, text, text, public.contact_method, public.app_language, jsonb),
  public.create_sessions(uuid, text, timestamptz, int, int, uuid, date, bigint, text, uuid),
  public.update_session(uuid, text, timestamptz, int, int, uuid, text),
  public.cancel_session(uuid, text)
  from public, anon;
grant execute on function
  public.staff_timetable(timestamptz, timestamptz), public.contact_list(), public.search_customers(text),
  public.staff_add_customer(text, text, text, public.contact_method, public.app_language, jsonb),
  public.create_sessions(uuid, text, timestamptz, int, int, uuid, date, bigint, text, uuid),
  public.update_session(uuid, text, timestamptz, int, int, uuid, text),
  public.cancel_session(uuid, text)
  to authenticated;
