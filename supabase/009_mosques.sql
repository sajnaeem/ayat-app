-- My mosque: prayer times read from a mosque's own website, shared by everyone who follows that mosque.
-- Only the edge function "mosque" (service role) writes here; the app can read. Which mosque someone follows is kept
-- on their phone only (it says roughly where they live), never in the database. Run after 008_ask.sql.

create table if not exists public.mosques (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,             -- the page the person pasted, normalised (https, no trailing slash)
  name text not null,
  source_url text,                      -- where the timetable actually lives (e.g. a published Google Sheet)
  source_kind text,                     -- 'page' | 'sheet'
  jumuah text[] not null default '{}',  -- Friday jama'ah times, e.g. {12:45, 13:20}
  checked_at timestamptz,
  ok boolean not null default false,    -- false when the last read failed
  note text,                            -- why it failed, for us
  created_at timestamptz not null default now()
);
alter table public.mosques enable row level security;
drop policy if exists "read mosques" on public.mosques;
create policy "read mosques" on public.mosques for select to anon, authenticated using (true);

-- One row per mosque per day. Times are "HH:MM" (24-hour, local UK time as the mosque publishes them).
create table if not exists public.mosque_times (
  mosque_id uuid not null references public.mosques (id) on delete cascade,
  day date not null,
  fajr text, fajr_j text, sunrise text,
  dhuhr text, dhuhr_j text,
  asr text, asr_j text,
  maghrib text, maghrib_j text,
  isha text, isha_j text,
  primary key (mosque_id, day)
);
alter table public.mosque_times enable row level security;
drop policy if exists "read mosque times" on public.mosque_times;
create policy "read mosque times" on public.mosque_times for select to anon, authenticated using (true);

-- Adding mosques costs an AI read, so it is limited per person per day (counted by the edge function).
create table if not exists public.mosque_adds (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.mosque_adds enable row level security;
create or replace function public.mosque_take(uid uuid, max_per_day int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.mosque_adds (user_id, day, count) values (uid, current_date, 1)
  on conflict (user_id, day) do update set count = mosque_adds.count + 1
  returning count into n;
  return n <= max_per_day;
end $$;
revoke all on function public.mosque_take(uuid, int) from public, anon, authenticated;
