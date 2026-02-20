-- Permite excluir tipos de atividade sem quebrar historico de alocacoes
-- Ao excluir uma atividade, as alocacoes relacionadas ficam com activity_type_id = null
alter table public.assignments
  drop constraint if exists assignments_activity_type_id_fkey;

alter table public.assignments
  add constraint assignments_activity_type_id_fkey
  foreign key (activity_type_id)
  references public.activity_types(id)
  on delete set null;

