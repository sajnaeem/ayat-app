-- Munib · Offline audio
--
-- Quran Foundation's terms allow keeping their content longer than a week only when it comes
-- through their Content Sync API and is synced again at least every 7 days. So the server keeps
-- a synced copy of each reciter's ayah-by-ayah audio list (file address + word timings), and
-- phones download from that list and re-check it at least weekly (src/lib/offline.ts).
--
-- Filled and kept fresh by the "qf" edge function ({ "sync": true }), called daily below.
-- Neither table is readable from the app directly: only the function (service role) uses them.

create table if not exists public.qf_audio (
  recitation int not null,
  s smallint not null,
  a smallint not null,
  file_id bigint,
  url text not null,
  seg jsonb,
  updated_at timestamptz,
  primary key (recitation, s, a)
);
create index if not exists qf_audio_file on public.qf_audio (recitation, file_id);

create table if not exists public.qf_sync (
  filter text primary key,
  token text,
  synced_at timestamptz not null default now(),
  rows int
);

alter table public.qf_audio enable row level security;
alter table public.qf_sync enable row level security;

-- Daily at 03:17 UTC; the function only does work when the last sync is 6+ days old.
create extension if not exists pg_cron;
select cron.unschedule('qf-sync') where exists (select 1 from cron.job where jobname = 'qf-sync');
select cron.schedule(
  'qf-sync',
  '17 3 * * *',
  $$ select net.http_post('https://skuhimrzjddujzwdedot.supabase.co/functions/v1/qf', '{"sync":true}'::jsonb, '{}'::jsonb, '{"Content-Type":"application/json"}'::jsonb, 140000) $$
);
