-- Mosques near you: Geoapify Places results (OpenStreetMap data) saved per map square (0.1° × 0.1°)
-- for a few days, so each area is looked up rarely. Function-only (RLS on, no policies).
create table if not exists public.osm_mosques (
  cell text primary key,
  places jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.osm_mosques enable row level security;
