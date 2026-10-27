-- Change list #5: each class type has its own badge, shown on the timetable (cards, week grid, month view).
-- The customer timetable now also returns the session type's name, colour and picture.
-- Changing a function's return columns needs drop + create, so its permissions are set again below.

drop function public.timetable(timestamptz, timestamptz);

create function public.timetable(p_from timestamptz, p_to timestamptz)
returns table (
  session_id uuid,
  session_type_id uuid,
  kind public.session_kind,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  instructor_name text,
  price_vnd bigint,
  capacity int,
  places_left int,  -- null for open play: customers only see when it's full
  is_full boolean,
  type_name text,
  type_colour text,
  type_picture_url text
)
language sql stable security definer
set search_path = ''
as $$
  select s.id, s.session_type_id, st.kind, s.title, s.starts_at, s.ends_at, sr.display_name,
         coalesce(s.price_vnd, st.drop_in_price_vnd), s.capacity,
         case when st.kind = 'open_play' or s.capacity is null then null
              else greatest(s.capacity - public.places_taken(s.id), 0) end,
         s.capacity is not null and public.places_taken(s.id) >= s.capacity,
         st.name, st.colour, st.picture_url
  from public.sessions s
  join public.session_types st on st.id = s.session_type_id
  left join public.staff_roles sr on sr.user_id = s.instructor_id
  where s.status = 'scheduled' and s.starts_at >= p_from and s.starts_at < p_to
    and p_to - p_from <= interval '62 days'
  order by s.starts_at
$$;

revoke execute on function public.timetable(timestamptz, timestamptz) from public;
grant execute on function public.timetable(timestamptz, timestamptz) to anon, authenticated;
