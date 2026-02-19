-- Fotos de antes/depois no ponto de alocacao

alter table public.assignment_attendances
  add column if not exists before_photo_url text,
  add column if not exists after_photo_url text;

-- Bucket para evidencias (publico para facilitar preview por URL)
insert into storage.buckets (id, name, public)
values ('assignment-evidences', 'assignment-evidences', true)
on conflict (id) do nothing;

-- Policies de storage (escopo por pasta do usuario)
drop policy if exists "assignment evidences select" on storage.objects;
create policy "assignment evidences select"
on storage.objects
for select
to authenticated
using (bucket_id = 'assignment-evidences');

drop policy if exists "assignment evidences insert" on storage.objects;
create policy "assignment evidences insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assignment-evidences'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  )
);

drop policy if exists "assignment evidences update" on storage.objects;
create policy "assignment evidences update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'assignment-evidences'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  )
)
with check (
  bucket_id = 'assignment-evidences'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  )
);

-- Atualiza RPC de ponto para receber URL da foto
create or replace function public.punch_assignment(
  p_assignment_id uuid,
  p_action text,
  p_photo_url text default null
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

grant execute on function public.punch_assignment(uuid, text, text) to authenticated;
