-- Removes everything the staging check created: sessions titled "QA …", customers named "QA …"
-- or using a delivered+qa-…@resend.dev address, and their bookings, packs, payments and emails.
-- Staging only. The QA manager and instructor logins are kept.
begin;
alter table public.credit_ledger disable trigger credit_ledger_no_update;
create temp table qa_c on commit drop as
  select id, user_id from public.customers where email like 'delivered+qa-%@resend.dev' or full_name like 'QA %';
create temp table qa_s on commit drop as select id from public.sessions where title like 'QA %';
create temp table qa_b on commit drop as
  select id from public.bookings where customer_id in (select id from qa_c) or session_id in (select id from qa_s);
create temp table qa_u on commit drop as
  select id from auth.users
  where email like 'delivered+qa-%@resend.dev' and email not in ('delivered+qa-manager@resend.dev', 'delivered+qa-instructor@resend.dev');
delete from public.notifications where booking_id in (select id from qa_b) or customer_id in (select id from qa_c);
delete from public.payments where booking_id in (select id from qa_b) or customer_id in (select id from qa_c) or session_id in (select id from qa_s);
delete from public.credit_ledger where booking_id in (select id from qa_b) or customer_id in (select id from qa_c);
delete from public.bookings where id in (select id from qa_b);
delete from public.pack_pauses where customer_pack_id in (select id from public.customer_packs where customer_id in (select id from qa_c));
delete from public.customer_packs where customer_id in (select id from qa_c);
update public.sessions set hire_customer_id = null where hire_customer_id in (select id from qa_c);
delete from public.sessions where id in (select id from qa_s);
delete from public.customers where id in (select id from qa_c);
delete from public.audit_log where actor in (select id from qa_u);
delete from auth.users where id in (select id from qa_u);
alter table public.credit_ledger enable trigger credit_ledger_no_update;
commit;
