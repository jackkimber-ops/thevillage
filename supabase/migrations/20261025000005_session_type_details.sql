-- Session details page (C5): who the class suits and what to bring.
alter table public.session_types
  add column suits text,
  add column suits_vi text,
  add column bring text,
  add column bring_vi text;
