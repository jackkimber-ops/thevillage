-- A pack bought on the day counts today's class (Jack, 10 Nov; change #40).
-- Before: selling a pack only switched *upcoming* unpaid bookings. Someone who came to a drop-in and bought a
-- 10-class pack after class kept the 450,000 drop-in, and the pack started with 10 credits.
-- Now, same day only (Vietnam date):
--   * an unpaid drop-in today moves onto the pack even once checked in or after the class has ended;
--   * a drop-in already paid today can count too, when the manager ticks it: the class moves onto the pack
--     and what was paid for it comes off the pack price (the drop-in payment stays recorded as it was).

-- Moves one booking onto a pack: reserve the credit, and mark it used if the session has already closed
-- (the 15-minute job does that for sessions still running).
create function public._move_booking_to_pack(p_booking_id uuid, p_pack_id uuid, p_credits int, p_session_closed boolean, p_reason text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_customer uuid;
begin
  update public.bookings set customer_pack_id = p_pack_id, credits = p_credits, unpaid = false, amount_due_vnd = 0
    where id = p_booking_id returning customer_id into v_customer;
  insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
  values (p_pack_id, v_customer, p_booking_id, 'reserve', -p_credits, p_reason, auth.uid());
  if p_session_closed then
    insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
    values (p_pack_id, v_customer, p_booking_id, 'use', 0, 'Attended', auth.uid());
  end if;
end;
$$;

-- Unpaid bookings to credits: upcoming ones as before, plus today's attended ones.
create or replace function public._switch_unpaid_to_credits(p_customer_id uuid) returns int
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
    select b.id, b.session_id, b.parents, b.children, s.starts_at, s.session_type_id, s.title, s.status as session_status, st.kind
    from public.bookings b
    join public.sessions s on s.id = b.session_id
    join public.session_types st on st.id = s.session_type_id
    where b.customer_id = p_customer_id and b.unpaid and b.paid_at is null and b.customer_pack_id is null
      and st.kind in ('class', 'open_play')
      and (
        (b.status = 'booked' and s.status = 'scheduled')
        or (b.status = 'attended' and s.status in ('scheduled', 'closed') and public.vn_date(s.starts_at) = public.vn_date(now()))
      )
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

    perform public._move_booking_to_pack(v_row.id, v_pack.id, v_needed, v_row.session_status = 'closed', 'Switched to pack: ' || v_row.title);
    v_switched := v_switched + 1;
  end loop;
  return v_switched;
end;
$$;

-- Today's drop-ins already paid for, that a pack could count instead (managers, selling a pack).
create function public.paid_drop_ins_today(p_customer_id uuid)
returns table (booking_id uuid, title text, starts_at timestamptz, session_type_id uuid, amount_vnd bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  return query
  select b.id, s.title, s.starts_at, s.session_type_id,
         (select sum(p.amount_vnd)::bigint from public.payments p where p.booking_id = b.id and p.paid_for = 'drop_in')
  from public.bookings b
  join public.sessions s on s.id = b.session_id
  join public.session_types st on st.id = s.session_type_id
  where b.customer_id = p_customer_id and b.customer_pack_id is null and b.status in ('booked', 'attended')
    and s.status in ('scheduled', 'closed') and st.kind = 'class'
    and public.vn_date(s.starts_at) = public.vn_date(now())
    and exists (select 1 from public.payments p where p.booking_id = b.id and p.paid_for = 'drop_in')
  order by s.starts_at;
end;
$$;

drop function public.sell_pack(uuid, uuid, public.payment_method, date, bigint);
create function public.sell_pack(
  p_customer_id uuid,
  p_pack_type_id uuid,
  p_method public.payment_method,
  p_valid_from date default null,
  p_amount_vnd bigint default null,
  p_count_paid_drop_ins boolean default false
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
  v_paid record;
  v_paid_ids uuid[] := '{}';
  v_less bigint := 0;
  v_note text := null;
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

  -- Today's paid drop-ins this pack covers (and whose day the pack covers), up to the pack's credits.
  if p_count_paid_drop_ins then
    for v_paid in
      select d.booking_id, d.title, d.amount_vnd from public.paid_drop_ins_today(p_customer_id) d
      where exists (select 1 from public.pack_type_covers c where c.pack_type_id = p_pack_type_id and c.session_type_id = d.session_type_id)
        and public.vn_date(d.starts_at) between v_from and v_to
      limit v_type.credits
    loop
      v_paid_ids := v_paid_ids || v_paid.booking_id;
      v_less := v_less + v_paid.amount_vnd;
      v_note := coalesce(v_note || '; ', 'Less drop-in paid today: ') || v_paid.title || ' ' || v_paid.amount_vnd;
    end loop;
  end if;
  v_amount := greatest(coalesce(p_amount_vnd, v_type.price_vnd) - v_less, 0);

  insert into public.customer_packs (customer_id, pack_type_id, name, credits, price_paid_vnd, valid_from, valid_to, sold_by)
  values (p_customer_id, p_pack_type_id, v_type.name, v_type.credits, v_amount, v_from, v_to, auth.uid())
  returning id into v_pack_id;

  insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason, created_by)
  values (v_pack_id, p_customer_id, 'purchase', v_type.credits, 'Bought ' || v_type.name, auth.uid());

  if v_amount > 0 then
    insert into public.payments (customer_id, amount_vnd, method, paid_for, customer_pack_id, note, recorded_by)
    values (p_customer_id, v_amount, p_method, 'pack', v_pack_id, v_note, auth.uid());
  end if;

  for v_paid in
    select b.id, s.title, s.status as session_status from public.bookings b join public.sessions s on s.id = b.session_id
    where b.id = any (v_paid_ids) order by s.starts_at
    for update of b
  loop
    perform public._move_booking_to_pack(v_paid.id, v_pack_id, 1, v_paid.session_status = 'closed', 'Counted in pack (drop-in paid): ' || v_paid.title);
  end loop;

  perform public._switch_unpaid_to_credits(p_customer_id);
  perform public.audit('sell_pack', 'customer_packs', v_pack_id::text, null,
                       jsonb_build_object('customer_id', p_customer_id, 'pack', v_type.name, 'amount_vnd', v_amount, 'method', p_method,
                                          'less_drop_ins_vnd', v_less, 'drop_in_bookings', to_jsonb(v_paid_ids)));
  return v_pack_id;
end;
$$;

revoke execute on function public._move_booking_to_pack(uuid, uuid, int, boolean, text),
  public.paid_drop_ins_today(uuid),
  public.sell_pack(uuid, uuid, public.payment_method, date, bigint, boolean) from public, anon, authenticated;
grant execute on function public.paid_drop_ins_today(uuid),
  public.sell_pack(uuid, uuid, public.payment_method, date, bigint, boolean) to authenticated;
