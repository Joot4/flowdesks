-- Ponto por alocacao (check-in/check-out)

create table if not exists public.assignment_attendances (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  employee_profile_id uuid not null references public.profiles(id) on delete cascade,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text not null check (status in ('NOT_STARTED', 'CHECKED_IN', 'DONE')) default 'NOT_STARTED',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out_at is null or (check_in_at is not null and check_out_at >= check_in_at))
);

create index if not exists assignment_attendance_employee_idx
  on public.assignment_attendances(employee_profile_id, created_at desc);

create or replace function public.set_assignment_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.check_in_at is null then
    new.status := 'NOT_STARTED';
    new.done := false;
  elsif new.check_in_at is not null and new.check_out_at is null then
    new.status := 'CHECKED_IN';
    new.done := false;
  else
    new.status := 'DONE';
    new.done := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assignment_attendance_set_updated_at on public.assignment_attendances;
create trigger trg_assignment_attendance_set_updated_at
before insert or update on public.assignment_attendances
for each row execute function public.set_assignment_attendance_updated_at();

alter table public.assignment_attendances enable row level security;

drop policy if exists assignment_attendance_select_scope on public.assignment_attendances;
create policy assignment_attendance_select_scope
on public.assignment_attendances
for select
using (
  employee_profile_id = auth.uid()
  or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
);

drop policy if exists assignment_attendance_write_admin on public.assignment_attendances;
create policy assignment_attendance_write_admin
on public.assignment_attendances
for all
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'))
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

create or replace function public.punch_assignment(
  p_assignment_id uuid,
  p_action text
)
returns public.assignment_attendances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_now timestamptz := now();
  v_assignment public.assignments;
  v_attendance public.assignment_attendances;
begin
  v_role := public.current_role();

  if v_role not in ('COLLABORATOR', 'ADMIN', 'SUPER_ADMIN') then
    raise exception 'sem permissao para bater ponto';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'alocacao nao encontrada';
  end if;

  if v_role = 'COLLABORATOR' and v_assignment.employee_profile_id <> auth.uid() then
    raise exception 'voce so pode bater ponto na propria alocacao';
  end if;

  if p_action = 'IN' then
    if v_now < (v_assignment.start_at - interval '30 minutes') then
      raise exception 'check-in disponivel apenas 30 minutos antes do inicio';
    end if;

    if v_now > (v_assignment.end_at + interval '30 minutes') then
      raise exception 'janela de check-in encerrada';
    end if;

    insert into public.assignment_attendances (
      assignment_id,
      employee_profile_id,
      check_in_at
    )
    values (
      v_assignment.id,
      v_assignment.employee_profile_id,
      v_now
    )
    on conflict (assignment_id) do update
      set check_in_at = coalesce(public.assignment_attendances.check_in_at, excluded.check_in_at),
          employee_profile_id = excluded.employee_profile_id
    returning * into v_attendance;

    return v_attendance;
  elsif p_action = 'OUT' then
    select * into v_attendance
    from public.assignment_attendances
    where assignment_id = v_assignment.id
    for update;

    if not found or v_attendance.check_in_at is null then
      raise exception 'registre o check-in antes do check-out';
    end if;

    if v_now < v_attendance.check_in_at then
      raise exception 'horario invalido para check-out';
    end if;

    update public.assignment_attendances
    set check_out_at = coalesce(check_out_at, v_now)
    where assignment_id = v_assignment.id
    returning * into v_attendance;

    return v_attendance;
  else
    raise exception 'acao invalida: use IN ou OUT';
  end if;
end;
$$;

grant execute on function public.punch_assignment(uuid, text) to authenticated;
