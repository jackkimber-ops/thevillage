-- Get-in-touch fail-safe (Jack, 10 Nov: a customer vanished from the list after an accidental "Contacted" tap,
-- and nobody could tell who had done what). Every contact and every unanswered try is logged with how, who and
-- when; done items stay on the dashboard for the rest of the day; anyone can undo, and the undo is logged too.

create type public.contact_way as enum ('whatsapp', 'zalo', 'call', 'in_person');
create type public.contact_outcome as enum ('contacted', 'no_answer', 'undone');

alter table public.bookings add column contacted_way public.contact_way;

create table public.contact_log (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id),
  customer_id uuid not null references public.customers (id),
  outcome public.contact_outcome not null,
  way public.contact_way,                       -- null for "undone"
  staff_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check ((outcome = 'undone') = (way is null))
);
create index on public.contact_log (booking_id, created_at);
create index on public.contact_log (customer_id, created_at);
alter table public.contact_log enable row level security;
create policy "staff read contact log" on public.contact_log for select to authenticated
  using (public.is_staff() and public.staff_can_see_customer(customer_id));

-- "Got in touch" or "no answer", by a way. Contacting twice is refused (someone else may just have done it).
create function public.log_contact(p_booking_id uuid, p_way public.contact_way, p_outcome public.contact_outcome)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_b public.bookings;
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  if p_outcome = 'undone' or p_way is null then perform public.fail('invalid_contact'); end if;
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found or not public.staff_can_see_customer(v_b.customer_id) then perform public.fail('booking_not_found'); end if;
  if p_outcome = 'contacted' then
    if v_b.contacted_at is not null then perform public.fail('already_contacted'); end if;
    update public.bookings set contacted_at = now(), contacted_by = auth.uid(), contacted_way = p_way where id = p_booking_id;
  end if;
  insert into public.contact_log (booking_id, customer_id, outcome, way, staff_id)
  values (p_booking_id, v_b.customer_id, p_outcome, p_way, auth.uid());
end;
$$;

-- Back on the to-contact list (an accidental tap, or the contact didn't really happen).
create function public.undo_contact(p_booking_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_b public.bookings;
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found or not public.staff_can_see_customer(v_b.customer_id) then perform public.fail('booking_not_found'); end if;
  if v_b.contacted_at is null then return; end if;
  update public.bookings set contacted_at = null, contacted_by = null, contacted_way = null where id = p_booking_id;
  insert into public.contact_log (booking_id, customer_id, outcome, way, staff_id)
  values (p_booking_id, v_b.customer_id, 'undone', null, auth.uid());
end;
$$;

-- The dashboard list: still to contact, plus those contacted today (shown as done, with who, how, when).
drop function public.contact_list();
create function public.contact_list()
returns table (
  booking_id uuid,
  customer_id uuid,
  full_name text,
  phone text,
  preferred_contact public.contact_method,
  first_booking boolean,
  unpaid boolean,
  amount_due_vnd bigint,
  source public.booking_source,
  free_trial boolean,
  children int,
  session_id uuid,
  title text,
  starts_at timestamptz,
  contacted_at timestamptz,
  contacted_by text,
  contacted_way public.contact_way,
  tries int,
  last_try_at timestamptz,
  last_try_by text,
  last_try_way public.contact_way
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then perform public.fail('staff_only'); end if;
  return query
  select b.id, c.id, c.full_name, c.phone, c.preferred_contact, b.first_booking, b.unpaid, b.amount_due_vnd, b.source,
         b.free_trial, b.children, s.id, s.title, s.starts_at,
         b.contacted_at, cb.display_name, b.contacted_way,
         (select count(*)::int from public.contact_log l where l.booking_id = b.id and l.outcome = 'no_answer'),
         t.created_at, tr.display_name, t.way
  from public.bookings b
  join public.customers c on c.id = b.customer_id
  join public.sessions s on s.id = b.session_id
  left join public.staff_roles cb on cb.user_id = b.contacted_by
  left join lateral (
    select l.created_at, l.staff_id, l.way from public.contact_log l
    where l.booking_id = b.id and l.outcome = 'no_answer' order by l.created_at desc, l.id desc limit 1
  ) t on true
  left join public.staff_roles tr on tr.user_id = t.staff_id
  where b.status = 'booked' and s.starts_at > now()
    and (b.contacted_at is null or public.vn_date(b.contacted_at) = public.vn_date(now()))
    and (b.first_booking or (b.unpaid and b.paid_at is null))
    and public.staff_can_see_customer(c.id)
  order by (b.contacted_at is not null), s.starts_at;
end;
$$;

-- A customer's contact history (their page in the staff app).
create function public.contact_history(p_customer_id uuid)
returns table (at timestamptz, outcome public.contact_outcome, way public.contact_way, staff_name text, title text, starts_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_staff() or not public.staff_can_see_customer(p_customer_id) then perform public.fail('staff_only'); end if;
  return query
  select l.created_at, l.outcome, l.way, r.display_name, s.title, s.starts_at
  from public.contact_log l
  join public.bookings b on b.id = l.booking_id
  join public.sessions s on s.id = b.session_id
  left join public.staff_roles r on r.user_id = l.staff_id
  where l.customer_id = p_customer_id
  order by l.created_at desc, l.id desc;
end;
$$;

revoke execute on function public.log_contact(uuid, public.contact_way, public.contact_outcome), public.undo_contact(uuid),
  public.contact_list(), public.contact_history(uuid) from public, anon, authenticated;
grant execute on function public.log_contact(uuid, public.contact_way, public.contact_outcome), public.undo_contact(uuid),
  public.contact_list(), public.contact_history(uuid) to authenticated;
