-- Notifications for collaborators (PWA/Realtim​e)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('COLLABORATOR_CREATED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_UPDATED')),
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Compat layer for pre-existing notifications table with different schema
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'userid'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'user_id'
  ) then
    alter table public.notifications rename column userid to user_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'userId'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'user_id'
  ) then
    alter table public.notifications rename column "userId" to user_id;
  end if;
end;
$$;

alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_user_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notifications_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('COLLABORATOR_CREATED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_UPDATED'));
  end if;
end;
$$;

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_scope on public.notifications;
create policy notifications_select_scope
on public.notifications
for select
using (
  auth.uid() = user_id
  or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
);

drop policy if exists notifications_insert_admin on public.notifications;
create policy notifications_insert_admin
on public.notifications
for insert
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists notifications_update_scope on public.notifications;
create policy notifications_update_scope
on public.notifications
for update
using (
  auth.uid() = user_id
  or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
)
with check (
  auth.uid() = user_id
  or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
);

create or replace function public.notify_collaborator_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, payload)
  values (
    new.profile_id,
    'COLLABORATOR_CREATED',
    'Cadastro concluido',
    'Seu cadastro de colaborador foi criado e voce ja pode acompanhar sua agenda.',
    jsonb_build_object('employee_id', new.id, 'employee_code', new.employee_code)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_collaborator_created on public.employees;
create trigger trg_notify_collaborator_created
after insert on public.employees
for each row execute function public.notify_collaborator_created();

create or replace function public.notify_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location text;
  v_activity text;
  v_start_local text;
  v_end_local text;
  v_title text;
  v_type text;
  v_message text;
begin
  select l.name into v_location from public.locations l where l.id = new.location_id;
  select a.name into v_activity from public.activity_types a where a.id = new.activity_type_id;

  v_start_local := to_char(new.start_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');
  v_end_local := to_char(new.end_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');

  if tg_op = 'INSERT' then
    v_type := 'ASSIGNMENT_CREATED';
    v_title := 'Nova alocacao recebida';
    v_message := format('Voce recebeu uma alocacao em %s (%s - %s).', coalesce(v_location, 'local a definir'), v_start_local, v_end_local);
  else
    v_type := 'ASSIGNMENT_UPDATED';
    v_title := 'Alocacao atualizada';
    v_message := format('Sua alocacao foi atualizada para %s (%s - %s).', coalesce(v_location, 'local a definir'), v_start_local, v_end_local);
  end if;

  insert into public.notifications (user_id, type, title, message, payload)
  values (
    new.employee_profile_id,
    v_type,
    v_title,
    v_message,
    jsonb_build_object(
      'assignment_id', new.id,
      'status', new.status,
      'start_at', new.start_at,
      'end_at', new.end_at,
      'location', v_location,
      'activity', v_activity
    )
  );

  if tg_op = 'UPDATE' and old.employee_profile_id is distinct from new.employee_profile_id then
    insert into public.notifications (user_id, type, title, message, payload)
    values (
      old.employee_profile_id,
      'ASSIGNMENT_UPDATED',
      'Alocacao remanejada',
      'Uma alocacao sua foi remanejada para outro colaborador.',
      jsonb_build_object('assignment_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_assignment_insert on public.assignments;
create trigger trg_notify_assignment_insert
after insert on public.assignments
for each row execute function public.notify_assignment_change();

drop trigger if exists trg_notify_assignment_update on public.assignments;
create trigger trg_notify_assignment_update
after update of employee_profile_id, start_at, end_at, location_id, activity_type_id, status
on public.assignments
for each row execute function public.notify_assignment_change();
