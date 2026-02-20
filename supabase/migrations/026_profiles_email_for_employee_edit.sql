-- Adiciona email ao profile para exibir no CRUD de colaboradores (edicao)
alter table public.profiles
  add column if not exists email text;

-- Backfill com base no auth.users
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

-- Mantem email preenchido no auto-create de profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'COLLABORATOR'
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

-- Garante que o RPC de criacao/reativacao atualize o email no profile
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

  insert into public.profiles (id, full_name, email, role, active)
  values (v_user_id, p_full_name, p_email, 'COLLABORATOR', true)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

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

