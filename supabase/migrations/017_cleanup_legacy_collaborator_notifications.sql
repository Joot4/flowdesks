-- Remove legacy collaborator-created notifications and restrict notification types
-- to calendar-related events only.

-- 1) Remove old notifications that are no longer part of the product rule.
delete from public.notifications
where type = 'COLLABORATOR_CREATED';

-- 2) Restrict valid types to assignment events only.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('ASSIGNMENT_CREATED', 'ASSIGNMENT_UPDATED'));
