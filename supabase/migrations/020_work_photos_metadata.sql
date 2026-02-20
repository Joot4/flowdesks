alter table public.assignment_work_photos
  add column if not exists captured_at timestamptz,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists accuracy_m double precision,
  add column if not exists heading_deg double precision,
  add column if not exists location_name text,
  add column if not exists location_address text,
  add column if not exists location_maps_url text;

create index if not exists assignment_work_photos_captured_at_idx
  on public.assignment_work_photos(captured_at desc);

create index if not exists assignment_work_photos_geo_idx
  on public.assignment_work_photos(latitude, longitude);
