-- Seed de alocacoes para Ronald Lazarini
-- Inicio em 20/02/2026 (5 dias seguidos), conforme planilha enviada.
-- Horario padrao aplicado: 07:00 -> 15:00 (America/Fortaleza, UTC-3).

do $$
declare
  v_employee_id uuid;
begin
  select p.id
  into v_employee_id
  from public.profiles p
  where lower(trim(coalesce(p.full_name, ''))) = lower('Ronald Lazarini')
  limit 1;

  if v_employee_id is null then
    raise exception 'Colaborador "Ronald Lazarini" nao encontrado em public.profiles';
  end if;
end $$;

with admin_actor as (
  select p.id
  from public.profiles p
  where p.active = true
    and p.role in ('ADMIN', 'SUPER_ADMIN')
  order by p.created_at asc
  limit 1
),
employee as (
  select p.id as employee_profile_id
  from public.profiles p
  where lower(trim(coalesce(p.full_name, ''))) = lower('Ronald Lazarini')
  limit 1
),
seed(work_date, establishment_name, city_name, state_code, activity_name) as (
  values
    (date '2026-02-20', 'Whole Foods Market', 'Fairfield', 'CT', 'Stain removal, stone guard'),
    (date '2026-02-21', 'Whole Foods Market', 'Fairfield', 'CT', 'Stain removal, stone guard'),
    (date '2026-02-22', 'Whole Foods Market', 'Wynnewood', 'PA', 'Offices floor scrub'),
    (date '2026-02-23', 'WF Daily Shop', 'Hells Kitchen', 'NY', 'Stone guard'),
    (date '2026-02-24', 'Whole Foods Market', 'Westport', 'CT', 'Concrete polishing - bakery display')
),
resolved as (
  select
    s.work_date,
    s.establishment_name,
    s.city_name,
    s.state_code,
    s.activity_name,
    e.employee_profile_id,
    l.id as location_id,
    l.address as location_address,
    at.id as activity_type_id,
    a.id as created_by
  from seed s
  cross join employee e
  left join admin_actor a on true
  left join lateral (
    select loc.*
    from public.locations loc
    where lower(trim(loc.name)) = lower(trim(s.establishment_name))
      and lower(trim(coalesce(loc.state, ''))) = lower(trim(s.state_code))
    order by
      case
        when lower(coalesce(loc.address, '')) like '%' || lower(s.city_name) || '%' then 0
        else 1
      end,
      loc.created_at asc
    limit 1
  ) l on true
  left join lateral (
    select act.id
    from public.activity_types act
    where lower(trim(act.name)) = lower(trim(s.activity_name))
    limit 1
  ) at on true
)
insert into public.assignments (
  id,
  employee_profile_id,
  start_at,
  end_at,
  location_id,
  activity_type_id,
  details,
  status,
  created_by,
  establishment_name,
  assignment_address,
  assignment_location,
  assignment_state
)
select
  gen_random_uuid(),
  r.employee_profile_id,
  (r.work_date::text || ' 07:00:00-03')::timestamptz,
  (r.work_date::text || ' 15:00:00-03')::timestamptz,
  r.location_id,
  r.activity_type_id,
  r.activity_name,
  'PLANNED',
  r.created_by,
  r.establishment_name,
  r.location_address,
  r.city_name,
  r.state_code
from resolved r
where not exists (
  select 1
  from public.assignments a
  where a.employee_profile_id = r.employee_profile_id
    and a.start_at = (r.work_date::text || ' 07:00:00-03')::timestamptz
    and a.end_at = (r.work_date::text || ' 15:00:00-03')::timestamptz
    and coalesce(a.assignment_location, '') = coalesce(r.city_name, '')
    and coalesce(a.assignment_state, '') = coalesce(r.state_code, '')
);

