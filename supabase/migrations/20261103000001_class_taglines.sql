-- A short line under each class's name on its page (owners' taglines, 3 Nov), editable in the catalog like the description.
alter table public.session_types add column tagline text, add column tagline_vi text;
