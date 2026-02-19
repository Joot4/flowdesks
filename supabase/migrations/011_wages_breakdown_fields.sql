alter table public.assignments
  add column if not exists qty_of_hour_days numeric(12,2),
  add column if not exists hourly_rate numeric(12,2),
  add column if not exists daily_rate numeric(12,2),
  add column if not exists fixed_wage numeric(12,2),
  add column if not exists expenses numeric(12,2),
  add column if not exists extras numeric(12,2),
  add column if not exists deductions numeric(12,2),
  add column if not exists total_amount numeric(12,2);
