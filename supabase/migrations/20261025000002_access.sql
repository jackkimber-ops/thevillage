-- Who can do what: role helpers and row-level security on every table.
-- Roles come from public.staff_roles, never from user_metadata.
-- Customers and instructors change data only through the functions in the next migration.

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so policies can use them without recursion)
-- ---------------------------------------------------------------------------

create function public.current_staff_role() returns public.staff_role
language sql stable security definer
set search_path = ''
as $$
  select role from public.staff_roles where user_id = auth.uid() and active
$$;

create function public.is_manager() returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce(public.current_staff_role() = 'manager', false) $$;

create function public.is_staff() returns boolean
language sql stable security definer
set search_path = ''
as $$ select public.current_staff_role() is not null $$;

create function public.current_customer_id() returns uuid
language sql stable security definer
set search_path = ''
as $$
  select id from public.customers where user_id = auth.uid() and anonymised_at is null
$$;

-- Instructors see the people booked into their own sessions, or everyone if a manager allows it.
create function public.staff_can_see_customer(p_customer_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when public.is_manager() then true
    when not public.is_staff() then false
    when (select instructor_access from public.staff_roles where user_id = auth.uid()) = 'all_customers' then true
    else exists (
      select 1
      from public.bookings b
      join public.sessions s on s.id = b.session_id
      where b.customer_id = p_customer_id and s.instructor_id = auth.uid()
    )
  end
$$;

create function public.staff_can_see_session(p_session_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when public.is_manager() then true
    when not public.is_staff() then false
    when (select instructor_access from public.staff_roles where user_id = auth.uid()) = 'all_customers' then true
    else exists (select 1 from public.sessions where id = p_session_id and instructor_id = auth.uid())
  end
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.studio_settings enable row level security;
alter table public.staff_roles enable row level security;
alter table public.session_types enable row level security;
alter table public.pack_types enable row level security;
alter table public.pack_type_covers enable row level security;
alter table public.customers enable row level security;
alter table public.customer_children enable row level security;
alter table public.customer_packs enable row level security;
alter table public.pack_pauses enable row level security;
alter table public.sessions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_children enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.closures enable row level security;
alter table public.audit_log enable row level security;
alter table public.job_runs enable row level security;

-- Public information: settings, catalog, timetable.
create policy "anyone reads settings" on public.studio_settings for select using (true);
create policy "managers edit settings" on public.studio_settings for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "anyone reads session types" on public.session_types for select using (true);
create policy "managers manage session types" on public.session_types for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "anyone reads pack types" on public.pack_types for select using (true);
create policy "managers manage pack types" on public.pack_types for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "anyone reads pack covers" on public.pack_type_covers for select using (true);
create policy "managers manage pack covers" on public.pack_type_covers for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "anyone reads closures" on public.closures for select using (true);
create policy "managers manage closures" on public.closures for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "anyone reads sessions" on public.sessions for select using (true);
create policy "managers create sessions" on public.sessions for insert to authenticated
  with check (public.is_manager());
create policy "instructors create own classes" on public.sessions for insert to authenticated
  with check (public.current_staff_role() = 'instructor' and instructor_id = auth.uid());
create policy "managers edit sessions" on public.sessions for update to authenticated
  using (public.is_manager()) with check (public.is_manager());
create policy "instructors edit own classes" on public.sessions for update to authenticated
  using (public.current_staff_role() = 'instructor' and instructor_id = auth.uid())
  with check (public.current_staff_role() = 'instructor' and instructor_id = auth.uid());

-- Staff
create policy "staff read own role" on public.staff_roles for select to authenticated
  using (user_id = auth.uid() or public.is_manager());
create policy "staff names are visible to staff" on public.staff_roles for select to authenticated
  using (public.is_staff());
create policy "managers manage staff" on public.staff_roles for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Customers
create policy "customers read themselves" on public.customers for select to authenticated
  using (user_id = auth.uid());
create policy "staff read customers they may see" on public.customers for select to authenticated
  using (public.staff_can_see_customer(id));
create policy "managers edit customers" on public.customers for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "customers read own children" on public.customer_children for select to authenticated
  using (customer_id = public.current_customer_id());
create policy "staff read children they may see" on public.customer_children for select to authenticated
  using (public.staff_can_see_customer(customer_id));
create policy "managers manage children" on public.customer_children for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Packs
create policy "customers read own packs" on public.customer_packs for select to authenticated
  using (customer_id = public.current_customer_id());
create policy "staff read packs they may see" on public.customer_packs for select to authenticated
  using (public.staff_can_see_customer(customer_id));

create policy "managers read pauses" on public.pack_pauses for select to authenticated
  using (public.is_manager());

-- Bookings
create policy "customers read own bookings" on public.bookings for select to authenticated
  using (customer_id = public.current_customer_id());
create policy "staff read bookings they may see" on public.bookings for select to authenticated
  using (public.staff_can_see_session(session_id));

create policy "customers read own booking children" on public.booking_children for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = public.current_customer_id()));
create policy "staff read booking children" on public.booking_children for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and public.staff_can_see_session(b.session_id)));

-- Ledger: read own; managers read all. Nobody writes directly.
create policy "customers read own ledger" on public.credit_ledger for select to authenticated
  using (customer_id = public.current_customer_id());
create policy "managers read ledger" on public.credit_ledger for select to authenticated
  using (public.is_manager());

-- Managers only
create policy "managers read payments" on public.payments for select to authenticated
  using (public.is_manager());
create policy "managers read audit log" on public.audit_log for select to authenticated
  using (public.is_manager());
create policy "managers read job runs" on public.job_runs for select to authenticated
  using (public.is_manager());

-- Helpers are for policies and functions, not for anonymous callers.
revoke execute on function public.current_staff_role(), public.is_manager(), public.is_staff(),
  public.current_customer_id(), public.staff_can_see_customer(uuid), public.staff_can_see_session(uuid)
  from public, anon;
grant execute on function public.current_staff_role(), public.is_manager(), public.is_staff(),
  public.current_customer_id(), public.staff_can_see_customer(uuid), public.staff_can_see_session(uuid)
  to authenticated, service_role;
