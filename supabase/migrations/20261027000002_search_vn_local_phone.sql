-- Customer search: a Vietnamese number typed the local way (0772 747 648) also finds the
-- customer saved as +84772747648. Only a leading 0 is read as Vietnam's +84.
create or replace function public.search_customers(p_query text)
returns table (customer_id uuid, full_name text, phone text, email text)
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
  select c.id, c.full_name, c.phone, c.email
  from public.customers c
  where c.anonymised_at is null
    and (lower(c.full_name) like '%' || v_q || '%'
         or c.email like '%' || v_q || '%'
         or (length(v_digits) >= 3 and c.phone like '%' || v_digits || '%')
         or (length(v_digits) >= 3 and v_vn is not null and c.phone like '+' || v_vn || '%'))
  order by c.full_name
  limit 20;
end;
$$;
