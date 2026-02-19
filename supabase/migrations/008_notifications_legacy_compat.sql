-- Compatibilidade com schemas legados de notifications
-- Remove NOT NULL de colunas extras (ex.: cliente_id) que nao fazem parte do modelo atual.

do $$
declare
  r record;
begin
  for r in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'notifications'
      and c.is_nullable = 'NO'
      and c.column_name not in ('id', 'user_id', 'type', 'title', 'message', 'payload', 'is_read', 'created_at')
  loop
    execute format('alter table public.notifications alter column %I drop not null', r.column_name);
  end loop;
end;
$$;
