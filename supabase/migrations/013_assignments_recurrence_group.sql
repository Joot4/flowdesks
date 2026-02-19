alter table public.assignments
  add column if not exists recurrence_group_id uuid;

create index if not exists assignments_recurrence_group_idx
  on public.assignments(recurrence_group_id);
