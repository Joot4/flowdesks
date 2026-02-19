-- Seed idempotente para acelerar testes do MVP.
-- Execute no SQL Editor (ou via supabase db query).

begin;

-- 1) Catalogos basicos (idempotente por nome)
insert into public.locations (name, address, active)
select v.name, v.address, true
from (
  values
    ('Matriz Fortaleza', 'Av. Santos Dumont, 1000 - Fortaleza/CE'),
    ('Filial Caucaia', 'Rod. CE-090, 500 - Caucaia/CE'),
    ('Cliente Centro', 'Rua Floriano Peixoto, 220 - Fortaleza/CE')
) as v(name, address)
where not exists (
  select 1 from public.locations l where l.name = v.name
);

insert into public.activity_types (name, active)
select v.name, true
from (
  values
    ('Visita Tecnica'),
    ('Manutencao Preventiva'),
    ('Treinamento'),
    ('Suporte em Campo')
) as v(name)
where not exists (
  select 1 from public.activity_types a where a.name = v.name
);

-- 2) Garantir cadastro employees para todos os colaboradores ativos
insert into public.employees (profile_id, employee_code, phone, job_title)
select
  p.id,
  'COLL-' || upper(substr(replace(p.id::text, '-', ''), 1, 8)),
  '(85) 9' || lpad((10000000 + row_number() over(order by p.created_at, p.id))::text, 8, '0'),
  'Colaborador de Campo'
from public.profiles p
where p.role = 'COLLABORATOR'
  and p.active
  and not exists (
    select 1 from public.employees e where e.profile_id = p.id
  );

-- 3) Alocacoes de teste (sem conflito por colaborador)
do $$
declare
  v_created_by uuid;
  v_location_1 uuid;
  v_location_2 uuid;
  v_activity_1 uuid;
  v_activity_2 uuid;
  v_base_local timestamp;
  r record;
begin
  select p.id
  into v_created_by
  from public.profiles p
  where p.role in ('SUPER_ADMIN', 'ADMIN')
    and p.active
  order by p.created_at
  limit 1;

  if v_created_by is null then
    raise notice 'Seed: nenhum ADMIN/SUPER_ADMIN ativo encontrado para created_by.';
    return;
  end if;

  select l.id into v_location_1 from public.locations l where l.name = 'Matriz Fortaleza' limit 1;
  select l.id into v_location_2 from public.locations l where l.name = 'Filial Caucaia' limit 1;
  select a.id into v_activity_1 from public.activity_types a where a.name = 'Visita Tecnica' limit 1;
  select a.id into v_activity_2 from public.activity_types a where a.name = 'Manutencao Preventiva' limit 1;

  v_base_local := date_trunc('day', now() at time zone 'America/Fortaleza') + interval '1 day';

  for r in
    select
      p.id as profile_id,
      row_number() over(order by p.created_at, p.id) as rn
    from public.profiles p
    where p.role = 'COLLABORATOR'
      and p.active
    order by p.created_at, p.id
    limit 8
  loop
    if not exists (
      select 1
      from public.assignments s
      where s.employee_profile_id = r.profile_id
        and s.details = '[SEED] Agenda A #' || r.rn::text
    ) then
      insert into public.assignments (
        employee_profile_id,
        start_at,
        end_at,
        location_id,
        activity_type_id,
        details,
        status,
        created_by
      )
      values (
        r.profile_id,
        (v_base_local + ((r.rn - 1) * interval '1 day') + interval '08:00') at time zone 'America/Fortaleza',
        (v_base_local + ((r.rn - 1) * interval '1 day') + interval '12:00') at time zone 'America/Fortaleza',
        v_location_1,
        v_activity_1,
        '[SEED] Agenda A #' || r.rn::text,
        'PLANNED',
        v_created_by
      );
    end if;

    if not exists (
      select 1
      from public.assignments s
      where s.employee_profile_id = r.profile_id
        and s.details = '[SEED] Agenda B #' || r.rn::text
    ) then
      insert into public.assignments (
        employee_profile_id,
        start_at,
        end_at,
        location_id,
        activity_type_id,
        details,
        status,
        created_by
      )
      values (
        r.profile_id,
        (v_base_local + ((r.rn - 1) * interval '1 day') + interval '13:00') at time zone 'America/Fortaleza',
        (v_base_local + ((r.rn - 1) * interval '1 day') + interval '17:00') at time zone 'America/Fortaleza',
        coalesce(v_location_2, v_location_1),
        coalesce(v_activity_2, v_activity_1),
        '[SEED] Agenda B #' || r.rn::text,
        'CONFIRMED',
        v_created_by
      );
    end if;
  end loop;

  raise notice 'Seed finalizado.';
end;
$$;

commit;
