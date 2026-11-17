-- "Count in a pack" (Jack, 17 Nov; change #55). A customer comes to a class as a drop-in and buys a pack later
-- (e.g. Dakota: came Monday, bought a 10-class pack on Tuesday). A manager moves that class onto the pack so it uses
-- a credit. If a drop-in payment was recorded for it but the money wasn't taken separately, the manager can remove
-- that payment in the same step (a copy is kept in the audit log). Classes that started up to 30 days ago, or later.
-- Picks the pack that runs out first among those that cover the class and are valid on its date.
create function public.count_booking_in_pack(p_booking_id uuid, p_remove_drop_in_payment boolean default false)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_b public.bookings;
  v_s public.sessions;
  v_kind public.session_kind;
  v_needed int;
  v_pack public.customer_packs;
  v_paid boolean;
  v_pay record;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then perform public.fail('booking_not_found'); end if;
  if v_b.status not in ('booked', 'attended') then perform public.fail('booking_not_active'); end if;
  if v_b.customer_pack_id is not null then perform public.fail('already_on_pack'); end if;
  if v_b.free_trial then perform public.fail('free_trial_not_counted'); end if;
  select * into v_s from public.sessions where id = v_b.session_id;
  if v_s.starts_at < now() - interval '30 days' then perform public.fail('too_long_ago'); end if;
  select kind into v_kind from public.session_types where id = v_s.session_type_id;
  v_needed := case when v_kind = 'open_play' then greatest(v_b.children, 1) else 1 end;

  v_paid := exists (select 1 from public.payments where booking_id = v_b.id and paid_for = 'drop_in');
  if v_paid and not p_remove_drop_in_payment then perform public.fail('drop_in_already_paid'); end if;

  select cp.* into v_pack
  from public.customer_packs cp
  where cp.customer_id = v_b.customer_id
    and exists (select 1 from public.pack_type_covers c where c.pack_type_id = cp.pack_type_id and c.session_type_id = v_s.session_type_id)
    and public.vn_date(v_s.starts_at) between cp.valid_from and public.pack_last_day(cp)
    and public.pack_balance(cp.id) >= v_needed
  order by public.pack_last_day(cp), cp.sold_at
  limit 1
  for update;
  if v_pack.id is null then perform public.fail('no_pack_covers'); end if;

  if v_paid then
    for v_pay in select * from public.payments where booking_id = v_b.id and paid_for = 'drop_in' loop
      perform public.audit('remove_payment', 'payments', v_pay.id::text, to_jsonb(v_pay),
        jsonb_build_object('reason', 'Not paid separately: the class was counted in a pack'));
      delete from public.payments where id = v_pay.id;
    end loop;
  end if;

  update public.bookings
    set customer_pack_id = v_pack.id, credits = v_needed, unpaid = false, amount_due_vnd = 0, paid_at = null
    where id = v_b.id;
  insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
  values (v_pack.id, v_b.customer_id, v_b.id, 'reserve', -v_needed, 'Counted in pack: ' || v_s.title, auth.uid());
  if v_s.status = 'closed' then
    insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
    values (v_pack.id, v_b.customer_id, v_b.id, 'use', 0, 'Attended', auth.uid());
  end if;
  perform public.audit('count_in_pack', 'bookings', v_b.id::text, to_jsonb(v_b),
    jsonb_build_object('customer_pack_id', v_pack.id, 'credits', v_needed, 'removed_drop_in_payment', v_paid));
  return v_pack.id;
end;
$$;
revoke execute on function public.count_booking_in_pack(uuid, boolean) from public, anon, authenticated;
grant execute on function public.count_booking_in_pack(uuid, boolean) to authenticated;
