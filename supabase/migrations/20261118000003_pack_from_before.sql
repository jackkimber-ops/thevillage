-- Manager tool 3 of 3: add a pack bought before the app (Jack, 17 Nov; change #57).
-- Some customers bought packs from Phuong before The Village opened. A manager adds the pack with its type, the date
-- it started (valid-from) and how many credits are left. No payment is recorded (it was paid before the app).
-- Ledger: the pack's credits ('purchase', "Bought before the app"), then the ones already used ('adjust', negative),
-- so the profile reads "7 of 10 left". Unpaid bookings then move onto it, as when a pack is sold.
create function public.add_pack_from_before(p_customer_id uuid, p_pack_type_id uuid, p_valid_from date, p_credits_left int)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_type public.pack_types;
  v_to date;
  v_pack_id uuid;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  select * into v_type from public.pack_types where id = p_pack_type_id;
  if not found then perform public.fail('pack_not_found'); end if;
  if not exists (select 1 from public.customers where id = p_customer_id and anonymised_at is null) then
    perform public.fail('customer_not_found');
  end if;
  if p_valid_from is null or p_valid_from > public.vn_date(now()) then perform public.fail('valid_from_in_future'); end if;
  if p_credits_left is null or p_credits_left < 1 or p_credits_left > v_type.credits then perform public.fail('invalid_credits'); end if;
  perform 1 from public.customers where id = p_customer_id for update;

  v_to := case
    when v_type.validity_months is not null then (p_valid_from + make_interval(months => v_type.validity_months))::date - 1
    else p_valid_from + v_type.validity_days - 1
  end;
  if v_to < public.vn_date(now()) then perform public.fail('pack_already_expired'); end if;

  insert into public.customer_packs (customer_id, pack_type_id, name, credits, price_paid_vnd, valid_from, valid_to, sold_by)
  values (p_customer_id, p_pack_type_id, v_type.name, v_type.credits, 0, p_valid_from, v_to, auth.uid())
  returning id into v_pack_id;

  insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason, created_by)
  values (v_pack_id, p_customer_id, 'purchase', v_type.credits, 'Bought before the app: ' || v_type.name, auth.uid());
  if p_credits_left < v_type.credits then
    insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason, created_by)
    values (v_pack_id, p_customer_id, 'adjust', p_credits_left - v_type.credits, 'Used before the app', auth.uid());
  end if;

  perform public._switch_unpaid_to_credits(p_customer_id);
  perform public.audit('add_pack_from_before', 'customer_packs', v_pack_id::text, null,
                       jsonb_build_object('customer_id', p_customer_id, 'pack', v_type.name, 'valid_from', p_valid_from,
                                          'valid_to', v_to, 'credits_left', p_credits_left));
  return v_pack_id;
end;
$$;

revoke execute on function public.add_pack_from_before(uuid, uuid, date, int) from public, anon, authenticated;
grant execute on function public.add_pack_from_before(uuid, uuid, date, int) to authenticated;
