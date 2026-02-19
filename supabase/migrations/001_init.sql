-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('SUPER_ADMIN','ADMIN','COLLABORATOR')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  employee_code text unique,
  phone text,
  job_title text,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  employee_profile_id uuid not null references public.profiles(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location_id uuid references public.locations(id),
  activity_type_id uuid references public.activity_types(id),
  details text,
  status text not null check (status in ('PLANNED','CONFIRMED','CANCELLED')) default 'PLANNED',
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.reassignment_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  from_employee_profile_id uuid not null references public.profiles(id),
  to_employee_profile_id uuid not null references public.profiles(id),
  reason text,
  done_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists assignments_employee_profile_start_idx on public.assignments(employee_profile_id, start_at);
create index if not exists assignments_location_start_idx on public.assignments(location_id, start_at);

-- Anti-overlap constraint
alter table public.assignments
  add constraint assignments_no_overlap
  exclude using gist (
    employee_profile_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status <> 'CANCELLED');

-- Trigger for assignments.updated_at
create or replace function public.set_assignments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_assignments_updated_at();

-- Helper function
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- Auto-create profile after signup (default collaborator)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'COLLABORATOR')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Guard profile updates for non-super-admin users
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  actor_role := public.current_role();

  if actor_role <> 'SUPER_ADMIN' then
    if new.role <> old.role or new.active <> old.active then
      raise exception 'apenas SUPER_ADMIN pode alterar role/active';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_profiles_guard_update
before update on public.profiles
for each row execute function public.guard_profile_update();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.locations enable row level security;
alter table public.activity_types enable row level security;
alter table public.assignments enable row level security;
alter table public.reassignment_logs enable row level security;

-- Policies: profiles
create policy profiles_select_self_or_admin
on public.profiles
for select
using (
  auth.uid() = id
  or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
);

create policy profiles_update_self
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy profiles_update_super_admin
on public.profiles
for update
using (public.current_role() = 'SUPER_ADMIN')
with check (public.current_role() = 'SUPER_ADMIN');

-- Policies: employees
create policy employees_select_scope
on public.employees
for select
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or profile_id = auth.uid()
);

create policy employees_insert_admin
on public.employees
for insert
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

create policy employees_update_admin
on public.employees
for update
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'))
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

create policy employees_delete_admin
on public.employees
for delete
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

-- Policies: locations
create policy locations_select_authenticated
on public.locations
for select
using (auth.uid() is not null);

create policy locations_write_admin
on public.locations
for all
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'))
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

-- Policies: activity_types
create policy activity_types_select_authenticated
on public.activity_types
for select
using (auth.uid() is not null);

create policy activity_types_write_admin
on public.activity_types
for all
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'))
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

-- Policies: assignments
create policy assignments_select_scope
on public.assignments
for select
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or employee_profile_id = auth.uid()
);

create policy assignments_write_admin
on public.assignments
for all
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'))
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

-- Policies: reassignment_logs
create policy reassignment_logs_select_scope
on public.reassignment_logs
for select
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or exists (
    select 1
    from public.assignments a
    where a.id = reassignment_logs.assignment_id
      and a.employee_profile_id = auth.uid()
  )
);

create policy reassignment_logs_insert_admin
on public.reassignment_logs
for insert
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

-- RPC: reassignment in transaction
create or replace function public.reassign_assignment(
  p_assignment_id uuid,
  p_to_employee_profile_id uuid,
  p_reason text
)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_assignment public.assignments;
  v_from_employee uuid;
begin
  v_role := public.current_role();
  if v_role not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'sem permissao para remanejar';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'assignment nao encontrado';
  end if;

  v_from_employee := v_assignment.employee_profile_id;

  update public.assignments
  set employee_profile_id = p_to_employee_profile_id,
      updated_at = now()
  where id = p_assignment_id
  returning * into v_assignment;

  insert into public.reassignment_logs (
    assignment_id,
    from_employee_profile_id,
    to_employee_profile_id,
    reason,
    done_by
  )
  values (
    p_assignment_id,
    v_from_employee,
    p_to_employee_profile_id,
    p_reason,
    auth.uid()
  );

  return v_assignment;
end;
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.reassign_assignment(uuid, uuid, text) to authenticated;
