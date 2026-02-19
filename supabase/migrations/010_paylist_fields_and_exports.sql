-- Campos para exportacao de paylist

alter table public.locations
  add column if not exists state text;

alter table public.assignments
  add column if not exists wages_info text;
