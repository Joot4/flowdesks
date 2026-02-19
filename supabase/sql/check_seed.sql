-- Checagem rapida pos-seed
select 'profiles' as table_name, count(*) as total from public.profiles
union all
select 'employees', count(*) from public.employees
union all
select 'locations', count(*) from public.locations
union all
select 'activity_types', count(*) from public.activity_types
union all
select 'assignments', count(*) from public.assignments
union all
select 'reassignment_logs', count(*) from public.reassignment_logs;

-- Preview da agenda (America/Fortaleza)
select
  s.id,
  p.full_name as collaborator,
  (s.start_at at time zone 'America/Fortaleza') as start_fortaleza,
  (s.end_at at time zone 'America/Fortaleza') as end_fortaleza,
  l.name as location,
  a.name as activity,
  s.status,
  s.details
from public.assignments s
join public.profiles p on p.id = s.employee_profile_id
left join public.locations l on l.id = s.location_id
left join public.activity_types a on a.id = s.activity_type_id
order by s.start_at
limit 50;
