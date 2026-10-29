-- Team feedback (29 Oct):
--   * private hire: managers set the agreed price on the session, so the payment section shows what's still to pay
--   * customer search shows credits left, like the full list

create function public.set_hire_price(p_session_id uuid, p_price_vnd bigint) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if p_price_vnd is not null and p_price_vnd <= 0 then perform public.fail('invalid_amount'); end if;
  update public.sessions s set price_vnd = p_price_vnd
    from public.session_types st
    where s.id = p_session_id and st.id = s.session_type_id and st.kind = 'private_hire';
  if not found then perform public.fail('session_not_found'); end if;
  perform public.audit('set_hire_price', 'sessions', p_session_id::text, null, jsonb_build_object('price_vnd', p_price_vnd));
end;
$$;

drop function public.search_customers(text);
create function public.search_customers(p_query text)
returns table (customer_id uuid, full_name text, phone text, email text, deactivated boolean, credits_left int)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_q text := lower(trim(p_query));
  v_digits text := regexp_replace(p_query, '\D', '', 'g');
  v_vn text := case when v_digits like '0%' then '84' || substr(v_digits, 2) end;
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  if length(v_q) < 2 then return; end if;
  return query
  select c.id, c.full_name, c.phone, c.email, c.deactivated_at is not null,
         -- Credits only for people this staff member may see (instructors: their own customers).
         case when public.staff_can_see_customer(c.id) then
           coalesce((select sum(public.pack_balance(p.id))::int from public.customer_packs p
                     where p.customer_id = c.id and public.pack_last_day(p) >= public.vn_date(now())), 0)
         end
  from public.customers c
  where c.anonymised_at is null
    and (lower(c.full_name) like '%' || v_q || '%'
         or c.email like '%' || v_q || '%'
         or (length(v_digits) >= 3 and c.phone like '%' || v_digits || '%')
         or (length(v_digits) >= 3 and v_vn is not null and c.phone like '+' || v_vn || '%'))
  order by c.deactivated_at is not null, c.full_name
  limit 20;
end;
$$;

revoke execute on function public.set_hire_price(uuid, bigint), public.search_customers(text) from public, anon, authenticated;
grant execute on function public.set_hire_price(uuid, bigint), public.search_customers(text) to authenticated;
