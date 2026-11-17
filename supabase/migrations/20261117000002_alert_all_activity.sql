-- Studio alerts for all booking activity (Jack, 17 Nov; change #50). Before: hello@ got an email only for a new
-- customer's first booking or an unpaid drop-in, and only when the customer booked it themselves. Now: every
-- booking (online, guest or by staff, including a manager booking someone into a finished class) and every
-- cancellation (on time or late, by the customer or staff). A whole session cancelled by staff is not repeated
-- per booking (staff did it, and each customer is emailed). The payload says what happened and who did it.

create or replace function public.on_booking_alert() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_first boolean;
begin
  if new.status not in ('booked', 'attended') then return null; end if;
  v_first := not exists (select 1 from public.bookings where customer_id = new.customer_id and id <> new.id);
  perform public.enqueue('staff_alert', 'alert:' || new.id, new.id, jsonb_build_object(
    'event', 'booked',
    'first', v_first,
    'source', new.source,
    'by', (select display_name from public.staff_roles where user_id = new.created_by)));
  return null;
end;
$$;

create function public.on_booking_cancel_alert() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.status = 'booked' and new.status in ('cancelled', 'late_cancelled')
     and (select status from public.sessions where id = new.session_id) <> 'cancelled' then
    perform public.enqueue('staff_alert', 'alert-cancel:' || new.id, new.id, jsonb_build_object(
      'event', new.status::text,
      'by', (select display_name from public.staff_roles where user_id = new.cancelled_by),
      'reason', new.cancel_reason,
      'credit_back', exists (select 1 from public.credit_ledger where booking_id = new.id and kind = 'return')));
  end if;
  return null;
end;
$$;
-- Deferred, like the customer's cancellation email, so the credit ledger row written in the same transaction is seen.
create constraint trigger bookings_cancel_alert after update of status on public.bookings
  deferrable initially deferred
  for each row execute function public.on_booking_cancel_alert();
revoke execute on function public.on_booking_cancel_alert() from public, anon, authenticated;
