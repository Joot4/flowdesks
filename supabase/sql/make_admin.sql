-- Troque <USER_UUID> pelo id em auth.users
update public.profiles
set role = 'ADMIN',
    active = true
where id = '<USER_UUID>';
