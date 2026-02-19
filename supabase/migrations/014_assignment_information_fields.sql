alter table public.assignments
  add column if not exists establishment_name text,
  add column if not exists assignment_address text,
  add column if not exists assignment_location text,
  add column if not exists assignment_state text;
