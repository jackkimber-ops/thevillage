-- Moving a session (Jack, 4 Nov): one email per person, even if a manager drags a session, then corrects it.
-- "Session moved" emails now wait 10 minutes. A further move within that time replaces the waiting email
-- (keeping the original time), and moving it back where it was sends nothing. The instructor gets an email
-- too when someone else moves their session.

alter type public.notification_kind add value if not exists 'instructor_session_moved';

alter table public.notifications
  add column send_after timestamptz not null default now(),
  add column staff_user_id uuid references auth.users (id);
create index notifications_due on public.notifications (send_after) where status = 'pending';
alter table public.notifications drop constraint notifications_about_someone,
  add constraint notifications_about_someone check (booking_id is not null or customer_id is not null or staff_user_id is not null);

create or replace function public.on_session_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_b record;
  v_prev public.notifications;
  v_from timestamptz;
  v_key text := extract(epoch from clock_timestamp())::text;
begin
  if new.status = 'scheduled' and old.status = 'scheduled' and new.starts_at <> old.starts_at then
    -- Customers booked into it.
    for v_b in select id from public.bookings where session_id = new.id and status = 'booked' loop
      v_prev := null;
      select * into v_prev from public.notifications
        where booking_id = v_b.id and kind = 'session_moved' and status = 'pending'
        order by id desc limit 1 for update;
      v_from := coalesce((v_prev.payload ->> 'old_starts_at')::timestamptz, old.starts_at);
      if v_prev.id is not null then
        update public.notifications set status = 'skipped', last_error = 'replaced by a later move' where id = v_prev.id;
      end if;
      if new.starts_at <> v_from then
        insert into public.notifications (kind, dedupe_key, booking_id, payload, send_after)
        values ('session_moved', 'moved:' || v_b.id || ':' || v_key, v_b.id,
                jsonb_build_object('old_starts_at', v_from), now() + interval '10 minutes');
      end if;
    end loop;

    -- The instructor, unless they moved it themselves.
    if new.instructor_id is not null and new.instructor_id is distinct from auth.uid() then
      v_prev := null;
      select * into v_prev from public.notifications
        where kind = 'instructor_session_moved' and status = 'pending' and staff_user_id = new.instructor_id
          and payload ->> 'session_id' = new.id::text
        order by id desc limit 1 for update;
      v_from := coalesce((v_prev.payload ->> 'old_starts_at')::timestamptz, old.starts_at);
      if v_prev.id is not null then
        update public.notifications set status = 'skipped', last_error = 'replaced by a later move' where id = v_prev.id;
      end if;
      if new.starts_at <> v_from then
        insert into public.notifications (kind, dedupe_key, staff_user_id, payload, send_after)
        values ('instructor_session_moved', 'instructor-moved:' || new.id || ':' || v_key, new.instructor_id,
                jsonb_build_object('old_starts_at', v_from, 'session_id', new.id,
                  'booked', (select count(*) from public.bookings where session_id = new.id and status = 'booked')),
                now() + interval '10 minutes');
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- The sender: only what's due, and instructor emails (no customer) come through with the instructor's details.
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
  preferred_contact public.contact_method,
  staff_email text,
  staff_name text
)
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Nobody to send to (no email, or anonymised): skip. Studio alerts and instructor emails go to staff.
  update public.notifications n set status = 'skipped', last_error = 'no email'
  from public.customers c
  where c.id = coalesce(n.customer_id, (select b.customer_id from public.bookings b where b.id = n.booking_id))
    and n.status = 'pending' and n.kind not in ('staff_alert', 'instructor_session_moved')
    and (c.email is null or c.anonymised_at is not null);

  return query
  with claimed as (
    select n.id from public.notifications n
    where ((n.status = 'pending' and n.send_after <= now())
           or (n.status = 'sending' and n.created_at < now() - interval '10 minutes'))
      and n.attempts < 5
    order by n.send_after, n.created_at
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
         public.cancel_cutoff(s.starts_at), b.id, c.id, c.full_name, c.phone, c.preferred_contact,
         su.email::text, sr.display_name
  from marked m
  left join public.bookings b on b.id = m.booking_id
  left join public.customers c on c.id = coalesce(m.customer_id, b.customer_id)
  left join public.sessions s on s.id = coalesce(b.session_id, (m.payload ->> 'session_id')::uuid)
  left join public.session_types st on st.id = s.session_type_id
  left join public.customer_packs cp on cp.id = b.customer_pack_id
  left join auth.users su on su.id = m.staff_user_id
  left join public.staff_roles sr on sr.user_id = m.staff_user_id;
end;
$$;
revoke execute on function public.claim_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_notifications(int) to service_role;
