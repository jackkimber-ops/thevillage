-- Team feedback (27 Oct): see the whole customer list without searching, with each customer's credits left.
-- Credits left = the balance of their packs that haven't ended (an expired pack's credits can't be used).
-- Staff only see who they may see (managers: everyone; instructors: their own customers).
create function public.customer_list(p_limit int default 50, p_offset int default 0)
returns table (customer_id uuid, full_name text, phone text, email text, deactivated boolean, credits_left int, created_at timestamptz, total bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  return query
  with mine as (
    select c.* from public.customers c
    where c.anonymised_at is null and c.full_name is not null and public.staff_can_see_customer(c.id)
  )
  select m.id, m.full_name, m.phone, m.email, m.deactivated_at is not null,
         coalesce((select sum(public.pack_balance(p.id))::int from public.customer_packs p
                   where p.customer_id = m.id and public.pack_last_day(p) >= public.vn_date(now())), 0),
         m.created_at, count(*) over ()
  from mine m
  order by m.deactivated_at is not null, lower(m.full_name)
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.customer_list(int, int) from public, anon, authenticated;
grant execute on function public.customer_list(int, int) to authenticated;
