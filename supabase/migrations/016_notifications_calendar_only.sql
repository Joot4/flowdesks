-- Keep collaborator notifications only for calendar changes.

-- 1) Stop notifying on collaborator creation.
drop trigger if exists trg_notify_collaborator_created on public.employees;
drop function if exists public.notify_collaborator_created();

-- 2) Notify only when assignments change.
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
  v_type text;
  v_title text;
  v_message text;
begin
  if tg_op = 'UPDATE'
    and old.employee_profile_id is not distinct from new.employee_profile_id
    and old.start_at is not distinct from new.start_at
    and old.end_at is not distinct from new.end_at
    and old.location_id is not distinct from new.location_id
    and old.activity_type_id is not distinct from new.activity_type_id
    and old.status is not distinct from new.status
  then
    return new;
  end if;

  select l.name into v_location from public.locations l where l.id = new.location_id;
  select a.name into v_activity from public.activity_types a where a.id = new.activity_type_id;

  v_start_local := to_char(new.start_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');
  v_end_local := to_char(new.end_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');

  if tg_op = 'INSERT' then
    v_type := 'ASSIGNMENT_CREATED';
    v_title := 'Nova alocacao recebida';
    v_message := format(
      'Voce recebeu uma alocacao em %s (%s - %s).',
      coalesce(v_location, 'local a definir'),
      v_start_local,
      v_end_local
    );
  else
    v_type := 'ASSIGNMENT_UPDATED';

    if new.status = 'CANCELLED' then
      v_title := 'Alocacao cancelada';
      v_message := format(
        'Uma alocacao em %s foi cancelada (%s - %s).',
        coalesce(v_location, 'local a definir'),
        v_start_local,
        v_end_local
      );
    else
      v_title := 'Alocacao atualizada';
      v_message := format(
        'Sua alocacao foi atualizada para %s (%s - %s).',
        coalesce(v_location, 'local a definir'),
        v_start_local,
        v_end_local
      );
    end if;
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

create or replace function public.notify_assignment_deleted()
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
begin
  select l.name into v_location from public.locations l where l.id = old.location_id;
  select a.name into v_activity from public.activity_types a where a.id = old.activity_type_id;

  v_start_local := to_char(old.start_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');
  v_end_local := to_char(old.end_at at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI');

  insert into public.notifications (user_id, type, title, message, payload)
  values (
    old.employee_profile_id,
    'ASSIGNMENT_UPDATED',
    'Alocacao removida',
    format(
      'Uma alocacao em %s foi removida (%s - %s).',
      coalesce(v_location, 'local a definir'),
      v_start_local,
      v_end_local
    ),
    jsonb_build_object(
      'assignment_id', old.id,
      'status', old.status,
      'start_at', old.start_at,
      'end_at', old.end_at,
      'location', v_location,
      'activity', v_activity
    )
  );

  return old;
end;
$$;

-- Recreate triggers for assignment events only.
drop trigger if exists trg_notify_assignment_insert on public.assignments;
create trigger trg_notify_assignment_insert
after insert on public.assignments
for each row execute function public.notify_assignment_change();

drop trigger if exists trg_notify_assignment_update on public.assignments;
create trigger trg_notify_assignment_update
after update of employee_profile_id, start_at, end_at, location_id, activity_type_id, status
on public.assignments
for each row execute function public.notify_assignment_change();

drop trigger if exists trg_notify_assignment_delete on public.assignments;
create trigger trg_notify_assignment_delete
after delete on public.assignments
for each row execute function public.notify_assignment_deleted();
