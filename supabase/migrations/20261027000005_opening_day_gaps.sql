-- Opening-day requirements found missing in the full check (27 Oct):
--   C8  an email when a booking is cancelled (not only when a whole session is)
--   S22 a welcome email for customers added by staff; staff edit and deactivate customers
--   S21 staff add, change and remove a customer's children
--   S25 an email to the studio when a new customer books or anyone books an unpaid drop-in
-- (S14 private hire payments use record_payment as it is; the screen was missing.)

-- ---------------------------------------------------------------------------
-- Emails: new kinds, and emails about a customer rather than a booking
-- ---------------------------------------------------------------------------

alter type public.notification_kind add value if not exists 'booking_cancelled';
alter type public.notification_kind add value if not exists 'welcome';
alter type public.notification_kind add value if not exists 'staff_alert';

alter table public.notifications
  alter column booking_id drop not null,
  add column customer_id uuid references public.customers (id),
  add constraint notifications_about_someone check (booking_id is not null or customer_id is not null);

-- Where studio alerts (S25) go. Empty means the studio contact email.
alter table public.studio_settings add column alert_email text;

create function public.enqueue_for_customer(p_kind public.notification_kind, p_key text, p_customer uuid, p_payload jsonb default '{}')
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notifications (kind, dedupe_key, customer_id, payload)
  values (p_kind, p_key, p_customer, p_payload)
  on conflict (dedupe_key) do nothing
$$;

-- C8: a cancelled booking. Runs at commit, so a whole session being cancelled (which sends its own
-- "session cancelled" email) can be told apart, and the credit ledger row already exists.
create function public.on_booking_cancelled() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.status = 'booked' and new.status in ('cancelled', 'late_cancelled')
     and (select status from public.sessions where id = new.session_id) <> 'cancelled' then
    perform public.enqueue('booking_cancelled', 'cancelled:' || new.id, new.id, jsonb_build_object(
      'late', new.status = 'late_cancelled',
      'credit_back', exists (select 1 from public.credit_ledger where booking_id = new.id and kind = 'return')));
  end if;
  return null;
end;
$$;
create constraint trigger bookings_cancelled after update of status on public.bookings
  deferrable initially deferred
  for each row execute function public.on_booking_cancelled();

-- S25: tell the studio about a new customer's first booking or an unpaid drop-in, unless staff made it.
create function public.on_booking_alert() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_first boolean;
begin
  if new.status <> 'booked' or exists (select 1 from public.staff_roles where user_id = new.created_by) then
    return null;
  end if;
  v_first := not exists (select 1 from public.bookings where customer_id = new.customer_id and id <> new.id);
  if v_first or (new.unpaid and not new.free_trial) then
    perform public.enqueue('staff_alert', 'alert:' || new.id, new.id, jsonb_build_object('first', v_first));
  end if;
  return null;
end;
$$;
create trigger bookings_alert after insert on public.bookings
  for each row execute function public.on_booking_alert();

-- S22: customers added by staff get a welcome email with the booking link.
create function public.on_customer_added() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.email is not null and exists (select 1 from public.staff_roles where user_id = new.created_by) then
    perform public.enqueue_for_customer('welcome', 'welcome:' || new.id, new.id);
  end if;
  return null;
end;
$$;
create trigger customers_welcome after insert on public.customers
  for each row execute function public.on_customer_added();

-- The sender reads everything an email needs. Booking emails as before; "welcome" has only the customer;
-- "staff_alert" goes to the studio, not the customer, so it isn't skipped when the customer has no email.
drop function public.claim_notifications(int);
create function public.claim_notifications(p_limit int default 25)
returns table (
  id bigint,
  kind public.notification_kind,
  payload jsonb,
  email text,
  language public.app_language,
  first_name text,
  session_title text,
  session_kind public.session_kind,
  starts_at timestamptz,
  ends_at timestamptz,
  child_names text[],
  parents int,
  credits int,
  pack_name text,
  unpaid boolean,
  amount_due_vnd bigint,
  free_trial boolean,
  cancel_cutoff timestamptz,
  booking_id uuid,
  customer_id uuid,
  full_name text,
  phone text,
  preferred_contact public.contact_method
)
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Nobody to send to (no email, or anonymised): skip. Studio alerts always have somewhere to go.
  update public.notifications n set status = 'skipped', last_error = 'no email'
  from public.customers c
  where c.id = coalesce(n.customer_id, (select b.customer_id from public.bookings b where b.id = n.booking_id))
    and n.status = 'pending' and n.kind <> 'staff_alert' and (c.email is null or c.anonymised_at is not null);

  return query
  with claimed as (
    select n.id from public.notifications n
    where (n.status = 'pending' or (n.status = 'sending' and n.created_at < now() - interval '10 minutes'))
      and n.attempts < 5
    order by n.created_at
    limit p_limit
    for update skip locked
  ), marked as (
    update public.notifications n set status = 'sending', attempts = n.attempts + 1
    from claimed where n.id = claimed.id
    returning n.*
  )
  select m.id, m.kind, m.payload, c.email, c.language, split_part(c.full_name, ' ', 1), s.title, st.kind, s.starts_at, s.ends_at,
         coalesce((select array_agg(k.name order by k.name) from public.booking_children bc join public.customer_children k on k.id = bc.child_id where bc.booking_id = b.id), '{}'),
         b.parents, b.credits, cp.name, b.unpaid and b.paid_at is null, b.amount_due_vnd, b.free_trial,
         public.cancel_cutoff(s.starts_at), b.id, c.id, c.full_name, c.phone, c.preferred_contact
  from marked m
  left join public.bookings b on b.id = m.booking_id
  join public.customers c on c.id = coalesce(m.customer_id, b.customer_id)
  left join public.sessions s on s.id = b.session_id
  left join public.session_types st on st.id = s.session_type_id
  left join public.customer_packs cp on cp.id = b.customer_pack_id;
end;
$$;
revoke execute on function public.claim_notifications(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- S22: edit and deactivate customers
-- ---------------------------------------------------------------------------

alter table public.customers add column deactivated_at timestamptz;

-- A deactivated customer can't be booked in, online or by staff, until reactivated.
create function public.check_customer_active() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.customers where id = new.customer_id and deactivated_at is not null) then
    perform public.fail('customer_deactivated');
  end if;
  return new;
end;
$$;
create trigger bookings_customer_active before insert on public.bookings
  for each row execute function public.check_customer_active();

create function public.staff_update_customer(
  p_customer_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_preferred_contact public.contact_method,
  p_language public.app_language
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old public.customers;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  if not public.is_staff() or not public.staff_can_see_customer(p_customer_id) then perform public.fail('staff_only'); end if;
  select * into v_old from public.customers where id = p_customer_id and anonymised_at is null for update;
  if not found then perform public.fail('customer_not_found'); end if;
  if coalesce(trim(p_full_name), '') = '' then perform public.fail('name_required'); end if;
  if exists (select 1 from public.customers where phone = p_phone and id <> p_customer_id) then perform public.fail('phone_exists'); end if;
  if v_email is not null and exists (select 1 from public.customers where email = v_email and id <> p_customer_id) then
    perform public.fail('email_exists');
  end if;
  update public.customers
    set full_name = trim(p_full_name), phone = p_phone, email = v_email, preferred_contact = p_preferred_contact, language = p_language,
        -- Email is the login: a new email means the old login no longer opens this customer; the next login with the new one does.
        user_id = case when v_email is distinct from v_old.email then null else user_id end
    where id = p_customer_id;
  perform public.audit('update_customer', 'customers', p_customer_id::text,
    jsonb_build_object('name', v_old.full_name, 'phone', v_old.phone, 'email', v_old.email),
    jsonb_build_object('name', p_full_name, 'phone', p_phone, 'email', v_email));
end;
$$;

-- Managers only: deactivating stops all new bookings for that person.
create function public.set_customer_active(p_customer_id uuid, p_active boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  update public.customers set deactivated_at = case when p_active then null else now() end
    where id = p_customer_id and anonymised_at is null;
  if not found then perform public.fail('customer_not_found'); end if;
  perform public.audit(case when p_active then 'reactivate_customer' else 'deactivate_customer' end, 'customers', p_customer_id::text, null, null);
end;
$$;

-- Search also says who is deactivated, so staff can find them to reactivate.
drop function public.search_customers(text);
create function public.search_customers(p_query text)
returns table (customer_id uuid, full_name text, phone text, email text, deactivated boolean)
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
  select c.id, c.full_name, c.phone, c.email, c.deactivated_at is not null
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

-- ---------------------------------------------------------------------------
-- S21: staff add, change and remove children on a customer's profile
-- ---------------------------------------------------------------------------

create function public.staff_save_child(p_customer_id uuid, p_child_id uuid, p_name text, p_birth_month date) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := p_child_id;
begin
  if not public.is_staff() or not public.staff_can_see_customer(p_customer_id) then perform public.fail('staff_only'); end if;
  if coalesce(trim(p_name), '') = '' then perform public.fail('name_required'); end if;
  if v_id is null then
    insert into public.customer_children (customer_id, name, birth_month)
    values (p_customer_id, trim(p_name), date_trunc('month', p_birth_month)::date)
    returning id into v_id;
  else
    update public.customer_children set name = trim(p_name), birth_month = date_trunc('month', p_birth_month)::date
      where id = v_id and customer_id = p_customer_id;
    if not found then perform public.fail('child_not_found'); end if;
  end if;
  return v_id;
end;
$$;

-- Removing a child keeps past bookings' head count; only the name link goes.
create function public.staff_remove_child(p_child_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_customer uuid;
begin
  select customer_id into v_customer from public.customer_children where id = p_child_id;
  if v_customer is null then perform public.fail('child_not_found'); end if;
  if not public.is_staff() or not public.staff_can_see_customer(v_customer) then perform public.fail('staff_only'); end if;
  delete from public.customer_children where id = p_child_id;
end;
$$;

revoke execute on function public.enqueue_for_customer(public.notification_kind, text, uuid, jsonb),
  public.staff_update_customer(uuid, text, text, text, public.contact_method, public.app_language),
  public.set_customer_active(uuid, boolean), public.search_customers(text),
  public.staff_save_child(uuid, uuid, text, date), public.staff_remove_child(uuid)
  from public, anon, authenticated;
grant execute on function
  public.staff_update_customer(uuid, text, text, text, public.contact_method, public.app_language),
  public.set_customer_active(uuid, boolean), public.search_customers(text),
  public.staff_save_child(uuid, uuid, text, date), public.staff_remove_child(uuid)
  to authenticated;
