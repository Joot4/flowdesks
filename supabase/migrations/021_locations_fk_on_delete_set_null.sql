-- Permite excluir locais sem quebrar historico de alocacoes
-- Ao excluir um local, as alocacoes relacionadas ficam com location_id = null
alter table public.assignments
  drop constraint if exists assignments_location_id_fkey;

alter table public.assignments
  add constraint assignments_location_id_fkey
  foreign key (location_id)
  references public.locations(id)
  on delete set null;

