-- M1 Closures (brought forward from the +1 month release, 3 Nov): managers close the studio for a day or
-- a few (Tết, public holidays). Sessions on those days are cancelled for everyone (credits back, emails, as S17),
-- active packs can be extended by the days closed, and no session can be put on a closed day afterwards.

create index on public.closures (starts_on, ends_on);

-- Nothing scheduled on a closed day (new sessions, weekly series, and sessions moved or dragged there).
create function public.sessions_not_on_closed_day() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_reason text;
begin
  if new.status = 'scheduled' then
    select reason into v_reason from public.closures
      where public.vn_date(new.starts_at) between starts_on and ends_on limit 1;
    if found then raise exception 'studio_closed:%', public.vn_date(new.starts_at) using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;
create trigger sessions_not_on_closed_day before insert or update of starts_at, status on public.sessions
  for each row execute function public.sessions_not_on_closed_day();

create function public.add_closure(p_starts_on date, p_ends_on date, p_reason text, p_extend_packs boolean)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_days int := p_ends_on - p_starts_on + 1;
  v_session record;
  v_pack record;
  v_sessions int := 0;
  v_bookings int := 0;
  v_packs int := 0;
  v_why text := 'Studio closed: ' || trim(coalesce(p_reason, ''));
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if coalesce(trim(p_reason), '') = '' then perform public.fail('reason_required'); end if;
  if p_ends_on < p_starts_on or v_days > 31 then perform public.fail('invalid_dates'); end if;
  if p_starts_on < public.vn_date(now()) then perform public.fail('closure_in_past'); end if;
  if exists (select 1 from public.closures where starts_on <= p_ends_on and ends_on >= p_starts_on) then
    perform public.fail('closure_overlaps');
  end if;

  -- Cancel what's on those days first (the trigger below would refuse nothing here: cancelling isn't scheduling).
  for v_session in
    select id from public.sessions
    where status = 'scheduled' and public.vn_date(starts_at) between p_starts_on and p_ends_on
    order by starts_at
  loop
    v_bookings := v_bookings + public.cancel_session(v_session.id, v_why);
    v_sessions := v_sessions + 1;
  end loop;

  insert into public.closures (starts_on, ends_on, reason, created_by)
  values (p_starts_on, p_ends_on, trim(p_reason), auth.uid())
  returning id into v_id;

  -- Packs that could be used on any closed day get the closed days back.
  if p_extend_packs then
    for v_pack in
      select cp.id, cp.valid_to from public.customer_packs cp
      where cp.valid_from <= p_ends_on and public.pack_last_day(cp) >= p_starts_on
    loop
      perform public.extend_pack(v_pack.id, v_pack.valid_to + v_days, v_why);
      v_packs := v_packs + 1;
    end loop;
  end if;

  perform public.audit('add_closure', 'closures', v_id::text, null,
    jsonb_build_object('from', p_starts_on, 'to', p_ends_on, 'reason', trim(p_reason), 'sessions', v_sessions, 'bookings', v_bookings, 'packs', v_packs));
  return jsonb_build_object('id', v_id, 'sessions', v_sessions, 'bookings', v_bookings, 'packs', v_packs);
end;
$$;

-- Reopen: the days can have sessions again. Cancelled sessions and extended packs stay as they are.
create function public.remove_closure(p_closure_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_c public.closures;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  delete from public.closures where id = p_closure_id returning * into v_c;
  if not found then perform public.fail('closure_not_found'); end if;
  perform public.audit('remove_closure', 'closures', p_closure_id::text, to_jsonb(v_c), null);
end;
$$;

revoke execute on function public.add_closure(date, date, text, boolean), public.remove_closure(uuid) from public, anon, authenticated;
grant execute on function public.add_closure(date, date, text, boolean), public.remove_closure(uuid) to authenticated;
