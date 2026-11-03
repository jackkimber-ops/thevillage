-- M3 Money report (brought forward from the +1 month release, 3 Nov): every payment recorded between two
-- Vietnam dates, with who paid and who recorded it, for the managers' report by day and payment method.

create function public.money_report(p_from date, p_to date)
returns table (payment_id uuid, vn_day date, recorded_at timestamptz, amount_vnd bigint, method public.payment_method,
               paid_for public.payment_for, customer_name text, recorded_by text, note text, what text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then perform public.fail('managers_only'); end if;
  if p_to < p_from or p_to - p_from > 400 then perform public.fail('invalid_dates'); end if;
  return query
    select p.id, public.vn_date(p.recorded_at), p.recorded_at, p.amount_vnd, p.method, p.paid_for,
           c.full_name, coalesce(r.display_name, 'staff'), p.note,
           coalesce(cp.name, s.title)
    from public.payments p
    left join public.customers c on c.id = p.customer_id
    left join public.staff_roles r on r.user_id = p.recorded_by
    left join public.customer_packs cp on cp.id = p.customer_pack_id
    left join public.bookings b on b.id = p.booking_id
    left join public.sessions s on s.id = coalesce(p.session_id, b.session_id)
    where p.recorded_at >= public.vn_at(p_from, '00:00') and p.recorded_at < public.vn_at(p_to + 1, '00:00')
    order by p.recorded_at;
end;
$$;

revoke execute on function public.money_report(date, date) from public, anon, authenticated;
grant execute on function public.money_report(date, date) to authenticated;
