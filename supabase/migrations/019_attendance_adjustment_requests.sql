create table if not exists public.assignment_attendance_requests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  employee_profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('IN', 'OUT')),
  requested_time timestamptz not null default now(),
  reason text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists assignment_attendance_requests_status_idx
  on public.assignment_attendance_requests(status, created_at desc);

create index if not exists assignment_attendance_requests_employee_idx
  on public.assignment_attendance_requests(employee_profile_id, created_at desc);

alter table public.assignment_attendance_requests enable row level security;

drop policy if exists assignment_attendance_requests_select_scope on public.assignment_attendance_requests;
create policy assignment_attendance_requests_select_scope
on public.assignment_attendance_requests
for select
to authenticated
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  or employee_profile_id = auth.uid()
);

drop policy if exists assignment_attendance_requests_insert_scope on public.assignment_attendance_requests;
create policy assignment_attendance_requests_insert_scope
on public.assignment_attendance_requests
for insert
to authenticated
with check (
  employee_profile_id = auth.uid()
  and public.current_role() in ('COLLABORATOR', 'ADMIN', 'SUPER_ADMIN')
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_attendance_requests.assignment_id
      and a.employee_profile_id = auth.uid()
  )
);

drop policy if exists assignment_attendance_requests_update_admin on public.assignment_attendance_requests;
create policy assignment_attendance_requests_update_admin
on public.assignment_attendance_requests
for update
to authenticated
using (public.current_role() in ('ADMIN', 'SUPER_ADMIN'))
with check (public.current_role() in ('ADMIN', 'SUPER_ADMIN'));

create or replace function public.review_attendance_request(
  p_request_id uuid,
  p_approve boolean,
  p_review_note text default null
)
returns public.assignment_attendance_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_request public.assignment_attendance_requests;
  v_assignment public.assignments;
  v_attendance public.assignment_attendances;
begin
  v_role := public.current_role();
  if v_role not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'sem permissao para revisar solicitacoes';
  end if;

  select * into v_request
  from public.assignment_attendance_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'solicitacao nao encontrada';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'solicitacao ja revisada';
  end if;

  select * into v_assignment
  from public.assignments
  where id = v_request.assignment_id
  for update;

  if not found then
    raise exception 'alocacao da solicitacao nao encontrada';
  end if;

  if p_approve then
    if v_request.request_type = 'IN' then
      insert into public.assignment_attendances (
        assignment_id,
        employee_profile_id,
        check_in_at
      )
      values (
        v_assignment.id,
        v_assignment.employee_profile_id,
        v_request.requested_time
      )
      on conflict (assignment_id) do update
      set check_in_at = coalesce(public.assignment_attendances.check_in_at, excluded.check_in_at),
          employee_profile_id = excluded.employee_profile_id;
    else
      select * into v_attendance
      from public.assignment_attendances
      where assignment_id = v_assignment.id
      for update;

      if not found or v_attendance.check_in_at is null then
        raise exception 'nao e possivel aprovar saida sem check-in registrado';
      end if;

      if v_request.requested_time < v_attendance.check_in_at then
        raise exception 'horario solicitado de saida e anterior ao check-in';
      end if;

      update public.assignment_attendances
      set check_out_at = coalesce(check_out_at, v_request.requested_time)
      where assignment_id = v_assignment.id;
    end if;

    update public.assignment_attendance_requests
    set status = 'APPROVED',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = p_review_note
    where id = v_request.id
    returning * into v_request;
  else
    update public.assignment_attendance_requests
    set status = 'REJECTED',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = p_review_note
    where id = v_request.id
    returning * into v_request;
  end if;

  return v_request;
end;
$$;

grant select, insert, update on public.assignment_attendance_requests to authenticated;
grant execute on function public.review_attendance_request(uuid, boolean, text) to authenticated;
