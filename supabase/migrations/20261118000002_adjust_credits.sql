-- Manager tool 2 of 3: adjust credits (Jack, 17 Nov; change #56).
-- A manager adds or takes away credits on one pack, with a reason: e.g. a class used before the app, a goodwill
-- credit, or correcting a mistake. The ledger stays append-only: one 'adjust' row (+ or -), plus an audit entry.
-- Taking away can't leave the pack below zero (credits held by upcoming bookings count as used).
create function public.adjust_credits(p_customer_pack_id uuid, p_amount int, p_reason text) returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_pack public.customer_packs;
  v_before int;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100 then perform public.fail('invalid_credits'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  select * into v_pack from public.customer_packs where id = p_customer_pack_id for update;
  if not found then perform public.fail('pack_not_found'); end if;
  v_before := public.pack_balance(v_pack.id);
  if v_before + p_amount < 0 then perform public.fail('not_enough_credits'); end if;

  insert into public.credit_ledger (customer_pack_id, customer_id, kind, amount, reason, created_by)
  values (v_pack.id, v_pack.customer_id, 'adjust', p_amount, trim(p_reason), auth.uid());
  perform public.audit('adjust_credits', 'customer_packs', v_pack.id::text, jsonb_build_object('credits_left', v_before),
                       jsonb_build_object('credits_left', v_before + p_amount, 'amount', p_amount, 'reason', trim(p_reason)));
  return v_before + p_amount;
end;
$$;

revoke execute on function public.adjust_credits(uuid, int, text) from public, anon, authenticated;
grant execute on function public.adjust_credits(uuid, int, text) to authenticated;
