-- S12/S22: an instructor who adds a new customer on the spot can open that customer straight away
-- (before, the profile was hidden until the customer was booked into one of their sessions,
-- so adding someone ended on "page not found").
alter table public.customers
  add column created_by uuid default auth.uid() references auth.users (id) on delete set null;

create or replace function public.staff_can_see_customer(p_customer_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when public.is_manager() then true
    when not public.is_staff() then false
    when (select instructor_access from public.staff_roles where user_id = auth.uid()) = 'all_customers' then true
    else exists (select 1 from public.customers c where c.id = p_customer_id and c.created_by = auth.uid())
      or exists (
        select 1
        from public.bookings b
        join public.sessions s on s.id = b.session_id
        where b.customer_id = p_customer_id and s.instructor_id = auth.uid()
      )
  end
$$;
