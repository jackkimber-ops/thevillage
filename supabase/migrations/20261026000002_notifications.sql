-- Stage 8: emails and calendar feeds.
-- Emails go through an outbox: database events add rows to `notifications`; a protected app route
-- (/api/jobs/send-emails, called every minute by pg_cron) claims them, sends them with Resend and records the result.
-- A unique dedupe key means the same email is never queued twice; claiming uses SKIP LOCKED so two runs can't overlap.

create type public.notification_kind as enum ('booking_confirmation', 'reminder', 'session_moved', 'session_cancelled');
create type public.notification_status as enum ('pending', 'sending', 'sent', 'failed', 'skipped');

create table public.notifications (
  id bigint generated always as identity primary key,
  kind public.notification_kind not null,
  dedupe_key text not null unique,
  booking_id uuid not null references public.bookings (id),
  status public.notification_status not null default 'pending',
  payload jsonb not null default '{}',   -- e.g. the old time for "session moved", the reason for "cancelled"
  attempts int not null default 0,
  last_error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_pending on public.notifications (created_at) where status in ('pending', 'sending');
alter table public.notifications enable row level security;
create policy "managers read notifications" on public.notifications for select to authenticated using (public.is_manager());

-- Per-environment job settings (the app's URL and the shared secret for the email route).
-- Set once per environment at setup; never in the repo. No policies: only the database itself reads it.
create table public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

create function public.enqueue(p_kind public.notification_kind, p_key text, p_booking uuid, p_payload jsonb default '{}')
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notifications (kind, dedupe_key, booking_id, payload)
  values (p_kind, p_key, p_booking, p_payload)
  on conflict (dedupe_key) do nothing
$$;

-- Confirmation for every new booking (online, guest or made by staff).
create function public.on_booking_created() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'booked' then
    perform public.enqueue('booking_confirmation', 'confirm:' || new.id, new.id);
  end if;
  return new;
end;
$$;
create trigger bookings_confirmation after insert on public.bookings
  for each row execute function public.on_booking_created();

-- A session moved to a new time: email everyone booked.
create function public.on_session_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_b record;
begin
  if new.status = 'scheduled' and old.status = 'scheduled' and new.starts_at <> old.starts_at then
    for v_b in select id from public.bookings where session_id = new.id and status = 'booked' loop
      perform public.enqueue('session_moved', 'moved:' || v_b.id || ':' || extract(epoch from new.starts_at)::bigint, v_b.id,
        jsonb_build_object('old_starts_at', old.starts_at));
    end loop;
  end if;
  return new;
end;
$$;
create trigger sessions_changed after update on public.sessions
  for each row execute function public.on_session_changed();

-- Cancelling a session for everyone now also emails everyone booked (same rules as before).
create or replace function public.cancel_session(p_session_id uuid, p_reason text) returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_count int := 0;
  v_b public.bookings;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'scheduled' then perform public.fail('session_not_found'); end if;
  for v_b in select * from public.bookings where session_id = p_session_id and status = 'booked' for update loop
    update public.bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = p_reason
      where id = v_b.id;
    if v_b.customer_pack_id is not null then
      insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason, created_by)
      values (v_b.customer_pack_id, v_b.customer_id, v_b.id, 'return', v_b.credits, 'Session cancelled: ' || p_reason, auth.uid());
    end if;
    perform public.enqueue('session_cancelled', 'session-cancelled:' || v_b.id, v_b.id, jsonb_build_object('reason', p_reason));
    v_count := v_count + 1;
  end loop;
  update public.sessions set status = 'cancelled' where id = p_session_id;
  perform public.audit('cancel_session', 'sessions', p_session_id::text, null, jsonb_build_object('reason', p_reason, 'bookings', v_count));
  return v_count;
end;
$$;

-- Day-before reminders at 18:00 Saigon time: everyone booked for tomorrow.
create function public.queue_reminders() returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with due as (
    select b.id
    from public.bookings b
    join public.sessions s on s.id = b.session_id
    where b.status = 'booked' and s.status = 'scheduled'
      and public.vn_date(s.starts_at) = public.vn_date(now()) + 1
  ), ins as (
    insert into public.notifications (kind, dedupe_key, booking_id)
    select 'reminder', 'reminder:' || id, id from due
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  insert into public.job_runs (job, ok, detail) values ('queue_reminders', true, jsonb_build_object('queued', v_count));
  return v_count;
end;
$$;

-- The email route claims a batch. Everything a template needs is read now, so a moved session shows its new time.
-- Emails stuck in 'sending' for 10 minutes (e.g. a crashed run) are retried; after 5 attempts they stay failed.
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
  booking_id uuid
)
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Nobody to send to (no email, or anonymised): skip.
  update public.notifications n set status = 'skipped', last_error = 'no email'
  from public.bookings b join public.customers c on c.id = b.customer_id
  where n.booking_id = b.id and n.status = 'pending' and (c.email is null or c.anonymised_at is not null);

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
         public.cancel_cutoff(s.starts_at), b.id
  from marked m
  join public.bookings b on b.id = m.booking_id
  join public.customers c on c.id = b.customer_id
  join public.sessions s on s.id = b.session_id
  join public.session_types st on st.id = s.session_type_id
  left join public.customer_packs cp on cp.id = b.customer_pack_id;
end;
$$;

create function public.finish_notification(p_id bigint, p_ok boolean, p_provider_id text default null, p_error text default null)
returns void
language sql security definer
set search_path = ''
as $$
  update public.notifications
    set status = case when p_ok then 'sent'::public.notification_status
                      when attempts >= 5 then 'failed'::public.notification_status
                      else 'pending'::public.notification_status end,
        sent_at = case when p_ok then now() end,
        provider_id = coalesce(p_provider_id, provider_id),
        last_error = case when p_ok then null else left(p_error, 500) end
  where id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Calendar feeds: a secret, revocable link per person; titles and times only, no names.
-- ---------------------------------------------------------------------------

create table public.calendar_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.calendar_tokens enable row level security;
create policy "people read their own feed link" on public.calendar_tokens for select to authenticated using (user_id = auth.uid());

-- Returns the caller's feed token, making one if needed; p_new = true replaces it (the old link stops working).
create function public.my_calendar_token(p_new boolean default false) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if auth.uid() is null then perform public.fail('not_logged_in'); end if;
  if not p_new then
    select token into v_token from public.calendar_tokens where user_id = auth.uid();
    if v_token is not null then return v_token; end if;
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.calendar_tokens (user_id, token) values (auth.uid(), v_token)
  on conflict (user_id) do update set token = excluded.token, created_at = now();
  return v_token;
end;
$$;

-- What a feed shows: a customer's upcoming bookings, or an instructor's own sessions (managers: every session).
create function public.calendar_feed(p_token text)
returns table (uid text, title text, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_role public.staff_role;
begin
  select user_id into v_user from public.calendar_tokens where token = p_token;
  if v_user is null then return; end if;
  select role into v_role from public.staff_roles where user_id = v_user and active;
  if v_role is not null then
    return query
    select s.id::text, s.title, s.starts_at, s.ends_at
    from public.sessions s
    where s.status <> 'cancelled' and s.starts_at > now() - interval '7 days' and s.starts_at < now() + interval '60 days'
      and (v_role = 'manager' or s.instructor_id = v_user);
  else
    return query
    select b.id::text, s.title, s.starts_at, s.ends_at
    from public.bookings b
    join public.customers c on c.id = b.customer_id
    join public.sessions s on s.id = b.session_id
    where c.user_id = v_user and b.status in ('booked', 'attended') and s.starts_at > now() - interval '7 days';
  end if;
end;
$$;

revoke execute on function
  public.enqueue(public.notification_kind, text, uuid, jsonb), public.on_booking_created(), public.on_session_changed(),
  public.queue_reminders(), public.claim_notifications(int), public.finish_notification(bigint, boolean, text, text),
  public.calendar_feed(text), public.my_calendar_token(boolean)
  from public, anon, authenticated;
grant execute on function public.claim_notifications(int), public.finish_notification(bigint, boolean, text, text), public.calendar_feed(text) to service_role;
grant execute on function public.my_calendar_token(boolean) to authenticated;

-- Schedules (UTC): reminders at 11:00 UTC = 18:00 Saigon; the email route every minute.
-- The route's URL and secret come from app_config, set per environment; without them nothing is called.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('queue-reminders', '0 11 * * *', 'select public.queue_reminders()');
    if exists (select 1 from pg_available_extensions where name = 'pg_net') then
      create extension if not exists pg_net;
      perform cron.schedule('send-emails', '* * * * *', $job$
        select net.http_post(
          url := (select value from public.app_config where key = 'app_url') || '/api/jobs/send-emails',
          headers := jsonb_build_object('Authorization', 'Bearer ' || (select value from public.app_config where key = 'cron_secret'))
        )
        where exists (select 1 from public.notifications where status = 'pending')
          and exists (select 1 from public.app_config where key = 'cron_secret')
      $job$);
    end if;
  end if;
end;
$$;
