-- Permite que ADMIN desative colaborador (active=false) sem alterar role.
-- SUPER_ADMIN continua com poderes totais.

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  actor_role := public.current_role();

  if actor_role <> 'SUPER_ADMIN' then
    -- Ninguem alem de SUPER_ADMIN pode alterar role.
    if new.role <> old.role then
      raise exception 'apenas SUPER_ADMIN pode alterar role';
    end if;

    -- ADMIN pode alterar active apenas de COLLABORATOR.
    if new.active <> old.active then
      if not (actor_role = 'ADMIN' and old.role = 'COLLABORATOR' and new.role = 'COLLABORATOR') then
        raise exception 'apenas SUPER_ADMIN pode alterar active';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists profiles_update_admin_collaborator on public.profiles;
create policy profiles_update_admin_collaborator
on public.profiles
for update
using (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  and role = 'COLLABORATOR'
)
with check (
  public.current_role() in ('ADMIN', 'SUPER_ADMIN')
  and role = 'COLLABORATOR'
);

