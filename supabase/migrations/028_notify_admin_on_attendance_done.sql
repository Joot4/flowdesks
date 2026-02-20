-- Notifica ADMIN/SUPER_ADMIN quando colaborador finaliza trabalho (check-out).

create or replace function public.notify_attendance_done_to_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.assignments;
  v_employee_name text;
  v_location_name text;
  v_start_local text;
  v_end_local text;
  v_checkout_local text;
  v_admin record;
begin
  -- Dispara apenas na transicao de "sem saida" -> "com saida"
  if new.check_out_at is null or old.check_out_at is not null then
    return new;
  end if;

  select a.*
  into v_assignment
  from public.assignments a
  where a.id = new.assignment_id;

  if not found then
    return new;
  end if;

  select p.full_name into v_employee_name
  from public.profiles p
  where p.id = new.employee_profile_id;

  select l.name into v_location_name
  from public.locations l
  where l.id = v_assignment.location_id;

  v_start_local := to_char(v_assignment.start_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');
  v_end_local := to_char(v_assignment.end_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');
  v_checkout_local := to_char(new.check_out_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');

  for v_admin in
    select p.id
    from public.profiles p
    where p.active = true
      and p.role in ('ADMIN', 'SUPER_ADMIN')
  loop
    insert into public.notifications (user_id, type, title, message, payload)
    values (
      v_admin.id,
      'ASSIGNMENT_UPDATED',
      'Trabalho finalizado',
      format(
        '%s finalizou o trabalho em %s. Saida registrada em %s (alocacao: %s - %s).',
        coalesce(v_employee_name, 'Colaborador'),
        coalesce(v_location_name, 'local a definir'),
        v_checkout_local,
        v_start_local,
        v_end_local
      ),
      jsonb_build_object(
        'assignment_id', v_assignment.id,
        'attendance_id', new.id,
        'employee_profile_id', new.employee_profile_id,
        'check_out_at', new.check_out_at,
        'location', v_location_name
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_attendance_done_to_admins on public.assignment_attendances;
create trigger trg_notify_attendance_done_to_admins
after update of check_out_at on public.assignment_attendances
for each row execute function public.notify_attendance_done_to_admins();

