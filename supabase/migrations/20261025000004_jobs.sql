-- Scheduled jobs (pg_cron, times in UTC; Saigon is UTC+7).
-- Each job is safe to run twice, works only on rows it locks, and writes a row to job_runs.

-- Core rule 2: every 15 minutes, close sessions that have ended.
-- Unmarked bookings become attended; reserved credits become used.
create function public.close_finished_sessions() returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session record;
  v_closed int := 0;
begin
  for v_session in
    select id from public.sessions
    where status = 'scheduled' and ends_at <= now()
    order by ends_at
    for update skip locked
  loop
    update public.bookings set status = 'attended'
      where session_id = v_session.id and status = 'booked';

    insert into public.credit_ledger (customer_pack_id, customer_id, booking_id, kind, amount, reason)
    select b.customer_pack_id, b.customer_id, b.id, 'use', 0,
           case when b.status = 'no_show' then 'No-show' else 'Attended' end
    from public.bookings b
    where b.session_id = v_session.id
      and b.status in ('attended', 'no_show')
      and b.customer_pack_id is not null
      and not exists (select 1 from public.credit_ledger l where l.booking_id = b.id and l.kind in ('use', 'forfeit', 'return'));

    update public.sessions set status = 'closed' where id = v_session.id;
    v_closed := v_closed + 1;
  end loop;

  insert into public.job_runs (job, ok, detail) values ('close_finished_sessions', true, jsonb_build_object('closed', v_closed));
  return v_closed;
end;
$$;

revoke execute on function public.close_finished_sessions() from public, anon, authenticated;

-- Schedule it where pg_cron is available (Supabase). Local test databases without pg_cron skip this.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('close-finished-sessions', '*/15 * * * *', 'select public.close_finished_sessions()');
  end if;
end;
$$;
