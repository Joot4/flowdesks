-- Maps URL on locations + RPC to create collaborator from existing auth user email

alter table public.locations
  add column if not exists maps_url text;

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

grant execute on function public.create_collaborator_by_email(text, text, text, text, text) to authenticated;
