alter table public.locations
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geofence_radius_m integer;

create or replace function public.punch_assignment(
  p_assignment_id uuid,
  p_action text,
  p_photo_url text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_accuracy_m double precision default null
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
  v_location public.locations;
  v_distance_m double precision;
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

  if v_assignment.location_id is not null then
    select * into v_location
    from public.locations
    where id = v_assignment.location_id;

    if found and v_location.latitude is not null and v_location.longitude is not null and v_location.geofence_radius_m is not null then
      if p_lat is null or p_lng is null then
        raise exception 'localizacao atual obrigatoria para bater ponto neste local';
      end if;

      -- Haversine distance in meters
      v_distance_m := 2 * 6371000 * asin(
        sqrt(
          pow(sin(radians((p_lat - v_location.latitude) / 2)), 2)
          + cos(radians(v_location.latitude))
          * cos(radians(p_lat))
          * pow(sin(radians((p_lng - v_location.longitude) / 2)), 2)
        )
      );

      if p_accuracy_m is not null and p_accuracy_m > 120 then
        raise exception 'gps com baixa precisao; aproxime-se do local e tente novamente';
      end if;

      if v_distance_m > v_location.geofence_radius_m then
        raise exception 'fora do cercado virtual: distancia %m (raio permitido: %m)', round(v_distance_m), v_location.geofence_radius_m;
      end if;
    end if;
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
      check_in_at,
      before_photo_url
    )
    values (
      v_assignment.id,
      v_assignment.employee_profile_id,
      v_now,
      p_photo_url
    )
    on conflict (assignment_id) do update
      set check_in_at = coalesce(public.assignment_attendances.check_in_at, excluded.check_in_at),
          before_photo_url = coalesce(public.assignment_attendances.before_photo_url, excluded.before_photo_url),
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
    set check_out_at = coalesce(check_out_at, v_now),
        after_photo_url = coalesce(after_photo_url, p_photo_url)
    where assignment_id = v_assignment.id
    returning * into v_attendance;

    return v_attendance;
  else
    raise exception 'acao invalida: use IN ou OUT';
  end if;
end;
$$;

grant execute on function public.punch_assignment(uuid, text, text, double precision, double precision, double precision) to authenticated;
