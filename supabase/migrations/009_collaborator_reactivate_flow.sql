-- Permitir fluxo de reativacao de colaborador por ADMIN

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
    -- Nunca pode alterar role sem ser SUPER_ADMIN
    if new.role <> old.role then
      raise exception 'apenas SUPER_ADMIN pode alterar role';
    end if;

    -- ADMIN pode alterar active apenas de perfis COLLABORATOR
    if new.active <> old.active then
      if not (actor_role = 'ADMIN' and old.role = 'COLLABORATOR' and new.role = 'COLLABORATOR') then
        raise exception 'apenas SUPER_ADMIN pode alterar active (exceto ADMIN em COLLABORATOR)';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.create_collaborator_by_email(
  p_email text,
  p_full_name text,
  p_employee_code text default null,
  p_phone text default null,
  p_job_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
begin
  v_role := public.current_role();
  if v_role not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'sem permissao para criar colaborador';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    raise exception 'usuario nao encontrado no auth para este email';
  end if;

  insert into public.profiles (id, full_name, role, active)
  values (v_user_id, p_full_name, 'COLLABORATOR', true)
  on conflict (id) do update
    set full_name = excluded.full_name;

  if v_role = 'SUPER_ADMIN' then
    update public.profiles
    set role = 'COLLABORATOR',
        active = true
    where id = v_user_id;
  else
    update public.profiles
    set active = true
    where id = v_user_id
      and role = 'COLLABORATOR';
  end if;

  insert into public.employees (profile_id, employee_code, phone, job_title)
  values (v_user_id, nullif(p_employee_code, ''), nullif(p_phone, ''), nullif(p_job_title, ''))
  on conflict (profile_id) do update
    set employee_code = excluded.employee_code,
        phone = excluded.phone,
        job_title = excluded.job_title;

  return v_user_id;
end;
$$;
