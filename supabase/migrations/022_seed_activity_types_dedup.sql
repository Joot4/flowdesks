-- Seed de atividades sem duplicacao (normalizado por trim/lower/espacos)
-- e limpeza de duplicados ja existentes.

with ranked as (
  select
    id,
    row_number() over (
      partition by lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      order by created_at asc, id asc
    ) as rn
  from public.activity_types
)
delete from public.activity_types a
using ranked r
where a.id = r.id
  and r.rn > 1;

with input_names(raw_name) as (
  values
    ('Stain removal, stone guard'),
    ('Offices floor scrub'),
    ('Stone guard'),
    ('Concrete polishing - bakery display'),
    ('Floor deep cleaning - BOH, entrances, prep foods area'),
    ('Stain removal'),
    ('Stone guard, detail cleaning'),
    ('Deep cleaning, disinfection under the shelves - aisles'),
    ('Stone guard, cases cleaning'),
    ('Scrub and stone guard'),
    ('Scrub and wax, detail cleaning'),
    ('Stone guard/Detail cleaning'),
    ('Foyer deep cleaning, escalator cleaning'),
    ('Escalator deep cleaning, pressure wash restrooms'),
    ('Detail cleaning, offices floors deep scrub'),
    ('BOH deep cleaning, pressure wash restrooms'),
    ('Reg cleaning'),
    ('Floor deep cleaning'),
    ('Stain removal, stone guard, grippy mats, detail cleaning'),
    ('Kitchen and bakery ceiling tiles deep cleaning'),
    ('Carpet cleaning'),
    ('Carpet cleaning, pressure wash rugs'),
    ('Restrooms deep scrub, elevator deep cleaning'),
    ('BOH deep cleaning, elevator deep cleaning, entrances')
),
normalized_input as (
  select distinct
    trim(regexp_replace(raw_name, '\s+', ' ', 'g')) as clean_name,
    lower(trim(regexp_replace(raw_name, '\s+', ' ', 'g'))) as clean_key
  from input_names
),
existing as (
  select
    lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) as clean_key
  from public.activity_types
)
insert into public.activity_types (name, active)
select i.clean_name, true
from normalized_input i
where not exists (
  select 1
  from existing e
  where e.clean_key = i.clean_key
);

