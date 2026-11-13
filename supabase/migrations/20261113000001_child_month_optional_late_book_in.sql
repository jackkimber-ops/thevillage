-- Owners via Jack, 13 Nov.
-- Change #42: a child's month of birth is optional (staff and customers): the name alone is enough.
-- Change #43: a manager can book someone into a class that has already finished, up to 7 days back
--   (e.g. she came this morning and bought a pack this evening). Staff "Book in" with Override booking times.
--   The booking is saved as attended (no confirmation email or studio alert), takes a credit from a pack valid on
--   that date if there is one (used straight away when the class has closed), otherwise it's an unpaid drop-in.
--   Capacity still applies. Instructors and older classes are refused as before.

alter table public.customer_children alter column birth_month drop not null;

create or replace function public._book(
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
  v_late boolean;       -- change #43: a manager booking someone into a class that has finished (up to 7 days back)
  v_status public.booking_status;
begin
  -- Lock the session row so two people can't take the last place at once.
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then perform public.fail('session_not_bookable'); end if;
  v_late := p_override_times and now() >= v_session.ends_at;
  if v_late then
    if not public.is_manager() then perform public.fail('session_finished'); end if;
    if v_session.ends_at < now() - interval '7 days' then perform public.fail('finished_too_long_ago'); end if;
    if v_session.status not in ('scheduled', 'closed') then perform public.fail('session_not_bookable'); end if;
  elsif now() >= v_session.ends_at and v_session.status in ('scheduled', 'closed') then
    perform public.fail('too_late_to_book'); -- staff: tick Override booking times (managers, up to 7 days back)
  elsif v_session.status <> 'scheduled' then
    perform public.fail('session_not_bookable');
  end if;
  v_status := case when v_late then 'attended' else 'booked' end; -- attended: no confirmation or studio alert

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
    values (p_session_id, p_customer_id, v_status, p_source, p_parents, v_children, true, v_first, auth.uid())
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
      values (p_session_id, p_customer_id, v_pack.id, v_status, p_source, p_parents, v_children, v_credits_needed, v_first, auth.uid())
      returning id into v_booking_id;
      insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
      values (v_pack.id, p_customer_id, v_booking_id, 'reserve', -v_credits_needed, 'Booked ' || v_session.title, auth.uid());
      -- A session already closed by the 15-minute job: the credit is used now (still running: the job does it).
      if v_late and v_session.status = 'closed' then
        insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
        values (v_pack.id, p_customer_id, v_booking_id, 'use', 0, 'Attended', auth.uid());
      end if;
    else
      -- Pay on the day.
      insert into public.bookings (session_id, customer_id, status, source, parents, children, unpaid, amount_due_vnd, first_booking, created_by)
      values (p_session_id, p_customer_id, v_status, p_source, p_parents, v_children,
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
