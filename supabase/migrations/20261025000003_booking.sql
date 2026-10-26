-- Booking, cancelling, attendance, packs and payments.
-- Every change to bookings, credits and payments goes through these functions;
-- the app never writes those tables directly.
-- Errors are raised with a short code as the message (e.g. 'session_full') for the app to translate.

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------

create function public.settings() returns public.studio_settings
language sql stable security definer
set search_path = ''
as $$ select * from public.studio_settings where id $$;

create function public.fail(code text) returns void
language plpgsql
set search_path = ''
as $$ begin raise exception '%', code using errcode = 'P0001'; end; $$;

create function public.audit(p_action text, p_entity text, p_entity_id text, p_before jsonb, p_after jsonb) returns void
language sql security definer
set search_path = ''
as $$
  insert into public.audit_log (actor, action, entity, entity_id, before, after)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_before, p_after)
$$;

-- The last day a pack can be used, including pauses.
create function public.pack_last_day(p public.customer_packs) returns date
language sql immutable
set search_path = ''
as $$ select p.valid_to + p.paused_days $$;

create function public.pack_balance(p_pack_id uuid) returns int
language sql stable security definer
set search_path = ''
as $$ select coalesce(sum(amount), 0)::int from public.credit_ledger where customer_pack_id = p_pack_id $$;

-- Free cancellation ends at the cutoff time on the evening before the session (Saigon time).
create function public.cancel_cutoff(p_starts_at timestamptz) returns timestamptz
language sql stable security definer
set search_path = ''
as $$
  select public.vn_at(public.vn_date(p_starts_at) - 1, (public.settings()).cancel_cutoff_time)
$$;

-- Places taken in a session: parents for classes and workshops, children for open play.
create function public.places_taken(p_session_id uuid) returns int
language sql stable security definer
set search_path = ''
as $$
  select coalesce(sum(case when st.kind = 'open_play' then b.children else b.parents end), 0)::int
  from public.bookings b
  join public.sessions s on s.id = b.session_id
  join public.session_types st on st.id = s.session_type_id
  where b.session_id = p_session_id and b.status in ('booked', 'attended', 'no_show')
$$;

-- ---------------------------------------------------------------------------
-- Booking (core rule 3: one function, one transaction)
-- ---------------------------------------------------------------------------

create function public._book(
  p_session_id uuid,
  p_customer_id uuid,
  p_child_ids uuid[],
  p_unnamed_children int,
  p_parents int,
  p_free_trial boolean,
  p_override_times boolean,
  p_source public.booking_source
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_settings public.studio_settings := public.settings();
  v_session public.sessions;
  v_kind public.session_kind;
  v_drop_in bigint;
  v_children int;
  v_units int;          -- places this booking takes
  v_credits_needed int; -- credits it would use from a pack
  v_pack public.customer_packs;
  v_booking_id uuid;
  v_first boolean;
begin
  -- Lock the session row so two people can't take the last place at once.
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'scheduled' then perform public.fail('session_not_bookable'); end if;

  select st.kind, coalesce(v_session.price_vnd, st.drop_in_price_vnd)
    into v_kind, v_drop_in
    from public.session_types st where st.id = v_session.session_type_id;
  if v_kind = 'private_hire' then perform public.fail('session_not_bookable'); end if;

  if not exists (select 1 from public.customers where id = p_customer_id and anonymised_at is null) then
    perform public.fail('customer_not_found');
  end if;

  -- Booking window: up to 1 month ahead, up to 1 hour before the start. Staff can override.
  if not p_override_times then
    if now() > v_session.starts_at - v_settings.latest_booking then perform public.fail('too_late_to_book'); end if;
    if v_session.starts_at > now() + v_settings.booking_window then perform public.fail('too_far_ahead'); end if;
  elsif now() >= v_session.ends_at then
    perform public.fail('session_finished');
  end if;

  -- Children must belong to this customer.
  p_child_ids := coalesce(p_child_ids, '{}');
  if exists (
    select 1 from unnest(p_child_ids) c
    where not exists (select 1 from public.customer_children k where k.id = c and k.customer_id = p_customer_id)
  ) then perform public.fail('child_not_found'); end if;
  v_children := cardinality(p_child_ids) + coalesce(p_unnamed_children, 0);

  if v_children > v_settings.max_children_per_booking then perform public.fail('too_many_children'); end if;
  if v_kind = 'open_play' then
    if v_children < 1 then perform public.fail('open_play_needs_a_child'); end if;
    if p_parents < 1 or p_parents > v_settings.max_parents_open_play then perform public.fail('too_many_parents'); end if;
    v_units := v_children;
    v_credits_needed := v_children;   -- 1 credit per child, parents free
  else
    if p_parents <> 1 then perform public.fail('one_parent_per_booking'); end if;
    v_units := 1;
    v_credits_needed := case when v_kind = 'workshop' then 0 else 1 end; -- workshops never use pack credits
  end if;

  -- Capacity is never overridden.
  if v_session.capacity is not null and public.places_taken(p_session_id) + v_units > v_session.capacity then
    perform public.fail('session_full');
  end if;

  if exists (
    select 1 from public.bookings
    where session_id = p_session_id and customer_id = p_customer_id and status in ('booked', 'attended', 'no_show')
  ) then perform public.fail('already_booked'); end if;

  v_first := not exists (select 1 from public.bookings where customer_id = p_customer_id and status <> 'cancelled');

  -- Free trial (given by a manager; classes only; one per customer).
  if p_free_trial then
    if v_kind <> 'class' then perform public.fail('free_trial_class_only'); end if;
    if exists (select 1 from public.bookings where customer_id = p_customer_id and free_trial and status <> 'cancelled') then
      perform public.fail('free_trial_used');
    end if;
    insert into public.bookings (session_id, customer_id, status, source, parents, children, free_trial, first_booking, created_by)
    values (p_session_id, p_customer_id, 'booked', p_source, p_parents, v_children, true, v_first, auth.uid())
    returning id into v_booking_id;
  else
    -- Pick the pack that expires first among packs that cover this session type,
    -- are valid on the session date and have enough credits.
    if v_credits_needed > 0 then
      select cp.* into v_pack
      from public.customer_packs cp
      where cp.customer_id = p_customer_id
        and exists (select 1 from public.pack_type_covers c where c.pack_type_id = cp.pack_type_id and c.session_type_id = v_session.session_type_id)
        and public.vn_date(v_session.starts_at) between cp.valid_from and public.pack_last_day(cp)
        and public.pack_balance(cp.id) >= v_credits_needed
      order by public.pack_last_day(cp), cp.sold_at
      limit 1
      for update;
    end if;

    if v_pack.id is not null then
      insert into public.bookings (session_id, customer_id, customer_pack_id, status, source, parents, children, credits, first_booking, created_by)
      values (p_session_id, p_customer_id, v_pack.id, 'booked', p_source, p_parents, v_children, v_credits_needed, v_first, auth.uid())
      returning id into v_booking_id;
      insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
      values (v_pack.id, p_customer_id, v_booking_id, 'reserve', -v_credits_needed, 'Booked ' || v_session.title, auth.uid());
    else
      -- Pay on the day.
      insert into public.bookings (session_id, customer_id, status, source, parents, children, unpaid, amount_due_vnd, first_booking, created_by)
      values (p_session_id, p_customer_id, 'booked', p_source, p_parents, v_children,
              coalesce(v_drop_in, 0) > 0, coalesce(v_drop_in, 0) * v_units, v_first, auth.uid())
      returning id into v_booking_id;
    end if;
  end if;

  if cardinality(p_child_ids) > 0 then
    insert into public.booking_children (booking_id, child_id) select v_booking_id, unnest(p_child_ids);
  end if;

  return v_booking_id;
end;
$$;

-- Customers book themselves; staff book anyone (and may override the booking times, never capacity).
create function public.book_session(
  p_session_id uuid,
  p_customer_id uuid default null,
  p_child_ids uuid[] default '{}',
  p_unnamed_children int default 0,
  p_parents int default 1,
  p_free_trial boolean default false,
  p_override_times boolean default false
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff boolean := public.is_staff();
  v_customer uuid := coalesce(p_customer_id, public.current_customer_id());
begin
  if auth.uid() is null then perform public.fail('not_logged_in'); end if;
  if not v_staff then
    if v_customer is null or v_customer is distinct from public.current_customer_id() then perform public.fail('not_allowed'); end if;
    if p_free_trial or p_override_times or p_unnamed_children <> 0 then perform public.fail('not_allowed'); end if;
  elsif p_free_trial and not public.is_manager() then
    perform public.fail('managers_only');
  end if;
  return public._book(p_session_id, v_customer, p_child_ids, p_unnamed_children, p_parents, p_free_trial, p_override_times,
                      case when v_staff then 'staff' else 'online' end::public.booking_source);
end;
$$;

-- Guest booking (not logged in), called by the server with the service role after the bot check.
-- Matches an existing customer by phone or email, never creating a second one.
create function public.book_as_guest(
  p_session_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_preferred_contact public.contact_method,
  p_language public.app_language,
  p_children jsonb default '[]', -- [{"name": "Mi", "birth_month": "2023-10-01"}]
  p_parents int default 1
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_by_phone uuid;
  v_by_email uuid;
  v_customer uuid;
  v_child_ids uuid[] := '{}';
  v_child jsonb;
  v_child_id uuid;
begin
  select id into v_by_phone from public.customers where phone = p_phone;
  select id into v_by_email from public.customers where email = v_email;
  v_customer := coalesce(v_by_email, v_by_phone);

  if v_customer is null then
    insert into public.customers (full_name, phone, email, preferred_contact, language)
    values (trim(p_full_name), p_phone, v_email, p_preferred_contact, p_language)
    returning id into v_customer;
  elsif v_by_phone is not null and v_by_email is not null and v_by_phone <> v_by_email then
    -- Phone and email match different customers: book under the email match and flag it.
    update public.customers set needs_review = true,
      review_note = 'Guest booking: phone matches another customer (' || v_by_phone || ')'
    where id = v_customer;
  end if;

  -- Guests (not logged in) get one unpaid upcoming booking at a time.
  if exists (
    select 1 from public.bookings b join public.sessions s on s.id = b.session_id
    where b.customer_id = v_customer and b.unpaid and b.paid_at is null and b.status = 'booked' and s.ends_at > now()
  ) then perform public.fail('guest_unpaid_limit'); end if;

  for v_child in select * from jsonb_array_elements(coalesce(p_children, '[]')) loop
    select id into v_child_id from public.customer_children
      where customer_id = v_customer and lower(name) = lower(trim(v_child ->> 'name'));
    if v_child_id is null then
      insert into public.customer_children (customer_id, name, birth_month)
      values (v_customer, trim(v_child ->> 'name'), date_trunc('month', (v_child ->> 'birth_month')::date)::date)
      returning id into v_child_id;
    end if;
    v_child_ids := v_child_ids || v_child_id;
    v_child_id := null;
  end loop;

  return public._book(p_session_id, v_customer, v_child_ids, 0, p_parents, false, false, 'guest');
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelling
-- ---------------------------------------------------------------------------

-- Before the cutoff: cancelled, credit returned. After it: customers can't (the app shows Message us);
-- staff can, and the credit is used unless a manager restores it.
create function public.cancel_booking(p_booking_id uuid, p_reason text default null) returns public.booking_status
language plpgsql security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_session public.sessions;
  v_staff boolean := public.is_staff();
  v_before_cutoff boolean;
  v_new public.booking_status;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then perform public.fail('booking_not_found'); end if;
  if not v_staff and v_booking.customer_id is distinct from public.current_customer_id() then perform public.fail('booking_not_found'); end if;
  if v_booking.status <> 'booked' then perform public.fail('booking_not_active'); end if;

  select * into v_session from public.sessions where id = v_booking.session_id for update;
  v_before_cutoff := now() < public.cancel_cutoff(v_session.starts_at);

  if not v_staff and not v_before_cutoff then perform public.fail('cutoff_passed'); end if;

  v_new := case when v_before_cutoff then 'cancelled' else 'late_cancelled' end;
  update public.bookings
    set status = v_new, cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = p_reason
    where id = p_booking_id;

  if v_booking.customer_pack_id is not null then
    insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
    values (v_booking.customer_pack_id, v_booking.customer_id, p_booking_id,
            case when v_before_cutoff then 'return' else 'forfeit' end::public.ledger_kind,
            case when v_before_cutoff then v_booking.credits else 0 end,
            case when v_before_cutoff then 'Cancelled in time' else 'Late cancellation' end,
            auth.uid());
  end if;

  if v_staff then
    perform public.audit('cancel_booking', 'bookings', p_booking_id::text, to_jsonb(v_booking),
                         jsonb_build_object('status', v_new, 'reason', p_reason));
  end if;
  return v_new;
end;
$$;

-- Managers can give back the credit for a late cancellation or no-show.
create function public.restore_credit(p_booking_id uuid, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.customer_pack_id is null then perform public.fail('nothing_to_restore'); end if;
  if v_booking.status not in ('late_cancelled', 'no_show') then perform public.fail('nothing_to_restore'); end if;
  if exists (select 1 from public.credit_ledger where booking_id = p_booking_id and kind = 'restore') then
    perform public.fail('already_restored');
  end if;
  insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
  values (v_booking.customer_pack_id, v_booking.customer_id, p_booking_id, 'restore', v_booking.credits, p_reason, auth.uid());
  perform public.audit('restore_credit', 'bookings', p_booking_id::text, null, jsonb_build_object('credits', v_booking.credits, 'reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Attendance and the get-in-touch list
-- ---------------------------------------------------------------------------

create function public.mark_attendance(p_booking_id uuid, p_status public.booking_status) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_session public.sessions;
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  if p_status not in ('booked', 'attended', 'no_show') then perform public.fail('invalid_status'); end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then perform public.fail('booking_not_found'); end if;
  select * into v_session from public.sessions where id = v_booking.session_id;
  if not public.is_manager() and v_session.instructor_id is distinct from auth.uid() then perform public.fail('not_allowed'); end if;
  if v_session.status = 'closed' then perform public.fail('session_closed'); end if;
  if v_booking.status not in ('booked', 'attended', 'no_show') then perform public.fail('booking_not_active'); end if;
  update public.bookings set status = p_status where id = p_booking_id;
end;
$$;

create function public.mark_contacted(p_booking_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  update public.bookings set contacted_at = now(), contacted_by = auth.uid()
  where id = p_booking_id and contacted_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Packs and payments (managers only)
-- ---------------------------------------------------------------------------

-- Moves a customer's upcoming pay-on-the-day bookings onto pack credits where a pack covers them.
create function public._switch_unpaid_to_credits(p_customer_id uuid) returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row record;
  v_pack public.customer_packs;
  v_needed int;
  v_switched int := 0;
begin
  for v_row in
    select b.id, b.session_id, b.parents, b.children, s.starts_at, s.session_type_id, s.title, st.kind
    from public.bookings b
    join public.sessions s on s.id = b.session_id
    join public.session_types st on st.id = s.session_type_id
    where b.customer_id = p_customer_id and b.status = 'booked' and b.unpaid and b.paid_at is null
      and s.status = 'scheduled' and st.kind in ('class', 'open_play')
    order by s.starts_at
    for update of b
  loop
    v_needed := case when v_row.kind = 'open_play' then v_row.children else 1 end;
    v_pack := null;
    select cp.* into v_pack
    from public.customer_packs cp
    where cp.customer_id = p_customer_id
      and exists (select 1 from public.pack_type_covers c where c.pack_type_id = cp.pack_type_id and c.session_type_id = v_row.session_type_id)
      and public.vn_date(v_row.starts_at) between cp.valid_from and public.pack_last_day(cp)
      and public.pack_balance(cp.id) >= v_needed
    order by public.pack_last_day(cp), cp.sold_at
    limit 1
    for update;
    continue when v_pack.id is null;

    update public.bookings
      set customer_pack_id = v_pack.id, credits = v_needed, unpaid = false, amount_due_vnd = 0
      where id = v_row.id;
    insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
    values (v_pack.id, p_customer_id, v_row.id, 'reserve', -v_needed, 'Switched to pack: ' || v_row.title, auth.uid());
    v_switched := v_switched + 1;
  end loop;
  return v_switched;
end;
$$;

create function public.sell_pack(
  p_customer_id uuid,
  p_pack_type_id uuid,
  p_method public.payment_method,
  p_valid_from date default null,
  p_amount_vnd bigint default null
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_type public.pack_types;
  v_from date := coalesce(p_valid_from, public.vn_date(now()));
  v_to date;
  v_amount bigint;
  v_pack_id uuid;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  select * into v_type from public.pack_types where id = p_pack_type_id;
  if not found or not v_type.on_sale then perform public.fail('pack_not_on_sale'); end if;
  if not exists (select 1 from public.customers where id = p_customer_id and anonymised_at is null) then
    perform public.fail('customer_not_found');
  end if;
  -- Serialise sales to the same customer (intro pack check).
  perform 1 from public.customers where id = p_customer_id for update;

  if v_type.is_intro and (
    exists (select 1 from public.customer_packs where customer_id = p_customer_id)
    or exists (select 1 from public.payments where customer_id = p_customer_id and paid_for in ('drop_in', 'pack'))
  ) then perform public.fail('intro_pack_new_customers_only'); end if;

  v_to := case
    when v_type.validity_months is not null then (v_from + make_interval(months => v_type.validity_months))::date - 1
    else v_from + v_type.validity_days - 1
  end;
  v_amount := coalesce(p_amount_vnd, v_type.price_vnd);

  insert into public.customer_packs (customer_id, pack_type_id, name, credits, price_paid_vnd, valid_from, valid_to, sold_by)
  values (p_customer_id, p_pack_type_id, v_type.name, v_type.credits, v_amount, v_from, v_to, auth.uid())
  returning id into v_pack_id;

  insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason, created_by)
  values (v_pack_id, p_customer_id, 'purchase', v_type.credits, 'Bought ' || v_type.name, auth.uid());

  if v_amount > 0 then
    insert into public.payments (customer_id, amount_vnd, method, paid_for, customer_pack_id, recorded_by)
    values (p_customer_id, v_amount, p_method, 'pack', v_pack_id, auth.uid());
  end if;

  perform public._switch_unpaid_to_credits(p_customer_id);
  perform public.audit('sell_pack', 'customer_packs', v_pack_id::text, null,
                       jsonb_build_object('customer_id', p_customer_id, 'pack', v_type.name, 'amount_vnd', v_amount, 'method', p_method));
  return v_pack_id;
end;
$$;

create function public.add_bonus_credits(p_customer_pack_id uuid, p_credits int, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_pack public.customer_packs;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if p_credits <= 0 then perform public.fail('invalid_amount'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  select * into v_pack from public.customer_packs where id = p_customer_pack_id for update;
  if not found then perform public.fail('pack_not_found'); end if;
  insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason, created_by)
  values (v_pack.id, v_pack.customer_id, 'bonus', p_credits, p_reason, auth.uid());
  perform public.audit('bonus_credits', 'customer_packs', v_pack.id::text, null, jsonb_build_object('credits', p_credits, 'reason', p_reason));
end;
$$;

-- Staff can extend an expired pack (business rule: "expired pack can't be used; staff can extend").
create function public.extend_pack(p_customer_pack_id uuid, p_new_valid_to date, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_pack public.customer_packs;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  select * into v_pack from public.customer_packs where id = p_customer_pack_id for update;
  if not found then perform public.fail('pack_not_found'); end if;
  if p_new_valid_to <= v_pack.valid_to then perform public.fail('must_extend'); end if;
  update public.customer_packs set valid_to = p_new_valid_to where id = p_customer_pack_id;
  perform public.audit('extend_pack', 'customer_packs', v_pack.id::text,
                       jsonb_build_object('valid_to', v_pack.valid_to), jsonb_build_object('valid_to', p_new_valid_to, 'reason', p_reason));
end;
$$;

create function public.record_payment(
  p_customer_id uuid,
  p_amount_vnd bigint,
  p_method public.payment_method,
  p_paid_for public.payment_for,
  p_booking_id uuid default null,
  p_session_id uuid default null,
  p_note text default null
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  insert into public.payments (customer_id, amount_vnd, method, paid_for, booking_id, session_id, note, recorded_by)
  values (p_customer_id, p_amount_vnd, p_method, p_paid_for, p_booking_id, p_session_id, p_note, auth.uid())
  returning id into v_id;
  if p_booking_id is not null then
    update public.bookings set paid_at = now() where id = p_booking_id and unpaid;
  end if;
  perform public.audit('record_payment', 'payments', v_id::text, null,
                       jsonb_build_object('amount_vnd', p_amount_vnd, 'method', p_method, 'for', p_paid_for));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer accounts
-- ---------------------------------------------------------------------------

-- First login ("your details"): links the logged-in email to an existing customer or creates one.
create function public.save_my_details(
  p_full_name text,
  p_phone text,
  p_preferred_contact public.contact_method,
  p_language public.app_language default 'en'
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_customer uuid;
begin
  if auth.uid() is null then perform public.fail('not_logged_in'); end if;
  select id into v_customer from public.customers where user_id = auth.uid();
  if v_customer is null then
    select id into v_customer from public.customers where email = v_email and user_id is null and anonymised_at is null;
  end if;
  if v_customer is null then
    select id into v_customer from public.customers where phone = p_phone and user_id is null and anonymised_at is null;
  end if;

  if v_customer is null then
    insert into public.customers (user_id, full_name, phone, email, preferred_contact, language)
    values (auth.uid(), trim(p_full_name), p_phone, v_email, p_preferred_contact, p_language)
    returning id into v_customer;
  else
    update public.customers
      set user_id = auth.uid(), full_name = trim(p_full_name), phone = p_phone,
          email = coalesce(email, v_email), preferred_contact = p_preferred_contact, language = p_language
      where id = v_customer;
  end if;
  return v_customer;
end;
$$;

create function public.add_my_child(p_name text, p_birth_month date) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_id uuid;
begin
  if v_customer is null then perform public.fail('not_logged_in'); end if;
  insert into public.customer_children (customer_id, name, birth_month)
  values (v_customer, trim(p_name), date_trunc('month', p_birth_month)::date)
  returning id into v_id;
  return v_id;
end;
$$;

-- M10: anonymise, never delete. Bookings, ledger and payments keep the customer id.
create function public.anonymise_customer(p_customer_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  delete from public.customer_children where customer_id = p_customer_id;
  update public.customers
    set full_name = 'Deleted customer', phone = null, email = null, notes = null, review_note = null,
        user_id = null, anonymised_at = now()
    where id = p_customer_id;
  perform public.audit('anonymise_customer', 'customers', p_customer_id::text, null, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Timetable for everyone (customers don't see other people's bookings)
-- ---------------------------------------------------------------------------

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
  places_left int,  -- null for open play: customers only see when it's full
  is_full boolean
)
language sql stable security definer
set search_path = ''
as $$
  select s.id, s.session_type_id, st.kind, s.title, s.starts_at, s.ends_at, sr.display_name,
         coalesce(s.price_vnd, st.drop_in_price_vnd), s.capacity,
         case when st.kind = 'open_play' or s.capacity is null then null
              else greatest(s.capacity - public.places_taken(s.id), 0) end,
         s.capacity is not null and public.places_taken(s.id) >= s.capacity
  from public.sessions s
  join public.session_types st on st.id = s.session_type_id
  left join public.staff_roles sr on sr.user_id = s.instructor_id
  where s.status = 'scheduled' and s.starts_at >= p_from and s.starts_at < p_to
    and p_to - p_from <= interval '62 days'
  order by s.starts_at
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

-- Supabase grants execute on new functions to anon and authenticated by default,
-- so take it away from everything and grant back only what callers need.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.timetable(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.vn_date(timestamptz), public.vn_at(date, time) to anon, authenticated;
grant execute on function
  public.book_session(uuid, uuid, uuid[], int, int, boolean, boolean),
  public.cancel_booking(uuid, text),
  public.restore_credit(uuid, text),
  public.mark_attendance(uuid, public.booking_status),
  public.mark_contacted(uuid),
  public.sell_pack(uuid, uuid, public.payment_method, date, bigint),
  public.add_bonus_credits(uuid, int, text),
  public.extend_pack(uuid, date, text),
  public.record_payment(uuid, bigint, public.payment_method, public.payment_for, uuid, uuid, text),
  public.save_my_details(text, text, public.contact_method, public.app_language),
  public.add_my_child(text, date),
  public.anonymise_customer(uuid),
  public.pack_balance(uuid),
  public.cancel_cutoff(timestamptz),
  public.current_staff_role(), public.is_manager(), public.is_staff(), public.current_customer_id(),
  public.staff_can_see_customer(uuid), public.staff_can_see_session(uuid)
  to authenticated;

grant execute on function
  public.book_as_guest(uuid, text, text, text, public.contact_method, public.app_language, jsonb, int)
  to service_role;
