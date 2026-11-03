-- S2 Staff page (brought forward from the +1 month release, 3 Nov): managers add staff, change their role,
-- name and instructor access, and switch access off (the row stays, since sessions and history point at it).
-- Rules live here, not in the screens: managers only; nobody switches themselves off or demotes themselves;
-- there is always at least one active manager.

-- Everyone with a staff role, with their login email and last sign-in (managers only).
create function public.staff_list()
returns table (user_id uuid, email text, display_name text, role public.staff_role,
               instructor_access public.instructor_access, active boolean, last_sign_in_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  return query
    select r.user_id, u.email::text, r.display_name, r.role, r.instructor_access, r.active, u.last_sign_in_at
    from public.staff_roles r
    join auth.users u on u.id = r.user_id
    order by r.active desc, r.role, r.display_name;
end;
$$;

-- The login with this email, if there is one (managers only). The app creates the login when there isn't.
create function public.manager_find_user(p_email text) returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  return (select id from auth.users where lower(email) = lower(trim(p_email)) limit 1);
end;
$$;

-- Add someone as staff, or change them.
create function public.manager_save_staff(
  p_user_id uuid,
  p_display_name text,
  p_role public.staff_role,
  p_access public.instructor_access,
  p_active boolean
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_before public.staff_roles;
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if coalesce(trim(p_display_name), '') = '' then perform public.fail('name_required'); end if;
  if not exists (select 1 from auth.users where id = p_user_id) then perform public.fail('user_not_found'); end if;
  if p_user_id = auth.uid() and (not p_active or p_role <> 'manager') then perform public.fail('not_yourself'); end if;

  select * into v_before from public.staff_roles where user_id = p_user_id for update;
  insert into public.staff_roles (user_id, role, display_name, instructor_access, active)
  values (p_user_id, p_role, trim(p_display_name), p_access, p_active)
  on conflict (user_id) do update
    set role = excluded.role, display_name = excluded.display_name,
        instructor_access = excluded.instructor_access, active = excluded.active;

  -- Can't happen while the caller is an active manager who can't demote themselves; kept as a backstop.
  if not exists (select 1 from public.staff_roles where role = 'manager' and active) then
    perform public.fail('last_manager');
  end if;
  perform public.audit(case when v_before.user_id is null then 'add_staff' else 'change_staff' end, 'staff_roles', p_user_id::text,
    to_jsonb(v_before), jsonb_build_object('role', p_role, 'name', trim(p_display_name), 'access', p_access, 'active', p_active));
end;
$$;

revoke execute on function public.staff_list(), public.manager_find_user(text),
  public.manager_save_staff(uuid, text, public.staff_role, public.instructor_access, boolean) from public, anon, authenticated;
grant execute on function public.staff_list(), public.manager_find_user(text),
  public.manager_save_staff(uuid, text, public.staff_role, public.instructor_access, boolean) to authenticated;
