create table if not exists public.assignment_work_photos (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  employee_profile_id uuid not null references public.profiles(id) on delete cascade,
  phase text not null check (phase in ('BEFORE', 'AFTER')),
  photo_url text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists assignment_work_photos_assignment_idx
  on public.assignment_work_photos(assignment_id, created_at desc);

create index if not exists assignment_work_photos_employee_idx
  on public.assignment_work_photos(employee_profile_id, created_at desc);

alter table public.assignment_work_photos enable row level security;

drop policy if exists assignment_work_photos_select_scope on public.assignment_work_photos;
create policy assignment_work_photos_select_scope
on public.assignment_work_photos
for select
to authenticated
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or employee_profile_id = auth.uid()
);

drop policy if exists assignment_work_photos_insert_scope on public.assignment_work_photos;
create policy assignment_work_photos_insert_scope
on public.assignment_work_photos
for insert
to authenticated
with check (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or (
    employee_profile_id = auth.uid()
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_work_photos.assignment_id
        and a.employee_profile_id = auth.uid()
    )
  )
);

drop policy if exists assignment_work_photos_delete_scope on public.assignment_work_photos;
create policy assignment_work_photos_delete_scope
on public.assignment_work_photos
for delete
to authenticated
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or employee_profile_id = auth.uid()
);

grant select, insert, delete on public.assignment_work_photos to authenticated;
