-- The Village booking system: types, tables and constraints.
-- All times are timestamptz; date logic uses Asia/Ho_Chi_Minh (see public.vn_date).
-- Money is VND as bigint. Credits are an append-only ledger.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.staff_role as enum ('manager', 'instructor');
create type public.instructor_access as enum ('own_sessions', 'all_customers');
create type public.session_kind as enum ('class', 'open_play', 'private_hire', 'workshop');
create type public.session_status as enum ('scheduled', 'cancelled', 'closed');
create type public.contact_method as enum ('whatsapp', 'zalo', 'call');
create type public.app_language as enum ('en', 'vi');
create type public.booking_status as enum ('booked', 'attended', 'no_show', 'cancelled', 'late_cancelled');
create type public.booking_source as enum ('online', 'staff', 'guest');
-- purchase/bonus/return/restore add credits; reserve takes one; use and forfeit
-- record what happened to a reserved credit (amount 0) so the history reads clearly.
create type public.ledger_kind as enum ('purchase', 'bonus', 'reserve', 'return', 'use', 'forfeit', 'restore', 'adjust');
create type public.payment_method as enum ('qr', 'transfer', 'cash');
create type public.payment_for as enum ('pack', 'drop_in', 'private_hire', 'workshop', 'other');

-- ---------------------------------------------------------------------------
-- Time helpers
-- ---------------------------------------------------------------------------

-- The studio's calendar date for a moment in time.
create function public.vn_date(ts timestamptz) returns date
language sql immutable parallel safe
set search_path = ''
as $$ select (ts at time zone 'Asia/Ho_Chi_Minh')::date $$;

-- A local date and time in Saigon as a timestamptz.
create function public.vn_at(d date, t time) returns timestamptz
language sql immutable parallel safe
set search_path = ''
as $$ select (d + t) at time zone 'Asia/Ho_Chi_Minh' $$;

-- ---------------------------------------------------------------------------
-- Studio settings (one row; never hard-coded in the app)
-- ---------------------------------------------------------------------------

create table public.studio_settings (
  id boolean primary key default true check (id),
  name text not null,
  address text not null,
  opening_hours text not null,
  contact_email text not null,
  contact_phone text not null,
  whatsapp_url text,
  zalo_url text,
  messenger_url text,
  facebook_url text,
  instagram_url text,
  maps_url text,
  cancel_cutoff_time time not null default '20:00',   -- the evening before the session
  booking_window interval not null default '1 month', -- how far ahead customers can book
  latest_booking interval not null default '1 hour',  -- latest time before the start
  reminder_time time not null default '18:00',        -- day-before reminder email
  max_children_per_booking int not null default 2 check (max_children_per_booking between 0 and 10),
  max_parents_open_play int not null default 2 check (max_parents_open_play between 1 and 10),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

create table public.staff_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  display_name text not null,
  instructor_access public.instructor_access not null default 'own_sessions',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.session_types (
  id uuid primary key default gen_random_uuid(),
  kind public.session_kind not null,
  name text not null,
  name_vi text,
  description text,
  description_vi text,
  colour text not null,
  picture_url text,
  default_minutes int not null check (default_minutes between 15 and 480),
  default_capacity int check (default_capacity between 1 and 200),
  drop_in_price_vnd bigint check (drop_in_price_vnd >= 0), -- per parent (class, workshop) or per child (open play)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pack_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_vi text,
  credits int not null check (credits > 0),
  price_vnd bigint not null check (price_vnd >= 0),
  validity_months int check (validity_months > 0),
  validity_days int check (validity_days > 0),
  is_intro boolean not null default false,
  on_sale boolean not null default true,
  sale_starts date,
  sale_ends date,
  created_at timestamptz not null default now(),
  check ((validity_months is null) <> (validity_days is null))
);

-- Which session types a pack can be used for.
create table public.pack_type_covers (
  pack_type_id uuid not null references public.pack_types (id) on delete cascade,
  session_type_id uuid not null references public.session_types (id) on delete cascade,
  primary key (pack_type_id, session_type_id)
);

-- ---------------------------------------------------------------------------
-- Customers (anonymised, never deleted: M10)
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text check (email = lower(email)),
  preferred_contact public.contact_method not null default 'whatsapp',
  language public.app_language not null default 'en',
  notes text,
  needs_review boolean not null default false, -- e.g. a guest's phone and email matched different customers
  review_note text,
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  check (anonymised_at is not null or phone is not null or email is not null)
);
create unique index customers_phone_key on public.customers (phone) where phone is not null;
create unique index customers_email_key on public.customers (email) where email is not null;

create table public.customer_children (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  birth_month date not null check (extract(day from birth_month) = 1),
  created_at timestamptz not null default now()
);
create index on public.customer_children (customer_id);

-- ---------------------------------------------------------------------------
-- Packs sold to customers
-- ---------------------------------------------------------------------------

create table public.customer_packs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  pack_type_id uuid not null references public.pack_types (id),
  name text not null,                 -- copied at sale
  credits int not null check (credits > 0),
  price_paid_vnd bigint not null check (price_paid_vnd >= 0), -- copied at sale; later price changes don't touch it
  valid_from date not null,
  valid_to date not null,             -- last valid day, before pauses
  paused_days int not null default 0 check (paused_days >= 0),
  sold_by uuid references auth.users (id),
  sold_at timestamptz not null default now(),
  check (valid_to >= valid_from)
);
create index on public.customer_packs (customer_id);

create table public.pack_pauses (
  id uuid primary key default gen_random_uuid(),
  customer_pack_id uuid not null references public.customer_packs (id),
  starts_on date not null,
  days int not null check (days > 0),
  reason text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sessions (one room: no overlaps)
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_type_id uuid not null references public.session_types (id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int check (capacity between 1 and 200), -- parents (class, workshop) or children (open play); null for private hire
  instructor_id uuid references public.staff_roles (user_id),
  price_vnd bigint check (price_vnd >= 0),         -- overrides the type's drop-in price (workshops)
  status public.session_status not null default 'scheduled',
  hire_customer_id uuid references public.customers (id), -- private hire
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint sessions_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index on public.sessions (starts_at);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id),
  customer_id uuid not null references public.customers (id),
  customer_pack_id uuid references public.customer_packs (id),
  status public.booking_status not null default 'booked',
  source public.booking_source not null,
  parents int not null default 1 check (parents between 1 and 10),
  children int not null default 0 check (children between 0 and 10),
  credits int not null default 0 check (credits >= 0), -- credits reserved from customer_pack_id
  free_trial boolean not null default false,
  unpaid boolean not null default false,               -- pay on the day
  amount_due_vnd bigint not null default 0 check (amount_due_vnd >= 0),
  paid_at timestamptz,
  first_booking boolean not null default false,        -- new customer: show in the get-in-touch list
  contacted_at timestamptz,
  contacted_by uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id),
  cancel_reason text,
  check ((customer_pack_id is null) = (credits = 0)),
  check (not (unpaid and customer_pack_id is not null))
);
create unique index bookings_one_active_per_customer
  on public.bookings (session_id, customer_id)
  where status in ('booked', 'attended', 'no_show');
create unique index bookings_one_free_trial
  on public.bookings (customer_id)
  where free_trial and status <> 'cancelled';
create index on public.bookings (customer_id);
create index on public.bookings (session_id);

create table public.booking_children (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  child_id uuid not null references public.customer_children (id) on delete cascade,
  primary key (booking_id, child_id)
);

-- ---------------------------------------------------------------------------
-- Credit ledger (append-only; balance = sum of amount)
-- ---------------------------------------------------------------------------

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  customer_pack_id uuid not null references public.customer_packs (id),
  customer_id uuid not null references public.customers (id),
  booking_id uuid references public.bookings (id),
  kind public.ledger_kind not null,
  amount int not null,
  reason text not null,
  created_by uuid references auth.users (id), -- null = the system (scheduled job)
  created_at timestamptz not null default now(),
  check (
    (kind in ('purchase', 'bonus', 'return', 'restore') and amount > 0)
    or (kind = 'reserve' and amount < 0)
    or (kind in ('use', 'forfeit') and amount = 0)
    or (kind = 'adjust' and amount <> 0)
  )
);
create index on public.credit_ledger (customer_pack_id);
create index on public.credit_ledger (booking_id);

create function public.ledger_is_append_only() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'credit_ledger is append-only';
end;
$$;

create trigger credit_ledger_no_update before update or delete on public.credit_ledger
  for each row execute function public.ledger_is_append_only();
create trigger credit_ledger_no_truncate before truncate on public.credit_ledger
  for each statement execute function public.ledger_is_append_only();

-- ---------------------------------------------------------------------------
-- Payments (managers only; kept when a customer is anonymised)
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id),
  amount_vnd bigint not null check (amount_vnd > 0),
  method public.payment_method not null,
  paid_for public.payment_for not null,
  customer_pack_id uuid references public.customer_packs (id),
  booking_id uuid references public.bookings (id),
  session_id uuid references public.sessions (id),
  note text,
  recorded_by uuid not null references auth.users (id),
  recorded_at timestamptz not null default now()
);
create index on public.payments (recorded_at);

-- ---------------------------------------------------------------------------
-- Closures (M1), audit log, job runs
-- ---------------------------------------------------------------------------

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  ok boolean not null,
  detail jsonb,
  ran_at timestamptz not null default now()
);
