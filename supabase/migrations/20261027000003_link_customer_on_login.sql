-- C15: a guest who books with their email and later logs in with it sees their bookings straight away.
-- The login code proves they own the email, so their customer record is linked at login
-- (before, it was only linked once they filled in "your details" again). Phone numbers aren't
-- verified, so they never link a login on their own.
create function public.link_my_customer() returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_customer uuid;
begin
  if auth.uid() is null then return null; end if;
  select id into v_customer from public.customers where user_id = auth.uid();
  if v_customer is not null or v_email is null then return v_customer; end if;
  update public.customers set user_id = auth.uid()
    where id = (select id from public.customers
                where email = v_email and user_id is null and anonymised_at is null
                order by created_at limit 1)
    returning id into v_customer;
  return v_customer;
end;
$$;

revoke execute on function public.link_my_customer() from public, anon, authenticated;
grant execute on function public.link_my_customer() to authenticated;
