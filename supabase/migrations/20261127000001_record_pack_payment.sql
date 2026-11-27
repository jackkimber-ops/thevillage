-- Record a payment against a pack after it was sold or added (Jack, 27 Nov; change #62).
-- Before, a pack's payment could only be taken when selling it. A pack can now be given first (e.g. an intro pack the
-- customer will pay for later) and the payment recorded when the money arrives: it shows in the money report on the day
-- it is recorded, as a pack payment tied to that pack. Managers only. Several payments can be recorded (part payments).
create function public.record_pack_payment(
  p_customer_pack_id uuid,
  p_amount_vnd bigint,
  p_method public.payment_method,
  p_note text default null
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_pack public.customer_packs;
  v_id uuid;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if p_amount_vnd is null or p_amount_vnd <= 0 or p_amount_vnd > 100000000 then perform public.fail('invalid_amount'); end if;
  select * into v_pack from public.customer_packs where id = p_customer_pack_id for update;
  if not found then perform public.fail('pack_not_found'); end if;

  insert into public.payments (customer_id, amount_vnd, method, paid_for, customer_pack_id, note, recorded_by)
  values (v_pack.customer_id, p_amount_vnd, p_method, 'pack', v_pack.id, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  update public.customer_packs set price_paid_vnd = price_paid_vnd + p_amount_vnd where id = v_pack.id;

  perform public.audit('record_payment', 'payments', v_id::text, null,
                       jsonb_build_object('amount_vnd', p_amount_vnd, 'method', p_method, 'for', 'pack', 'pack', v_pack.name, 'customer_pack_id', v_pack.id));
  return v_id;
end;
$$;

revoke execute on function public.record_pack_payment(uuid, bigint, public.payment_method, text) from public, anon, authenticated;
grant execute on function public.record_pack_payment(uuid, bigint, public.payment_method, text) to authenticated;
