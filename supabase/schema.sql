-- Ayat database: profiles, likes, saves/progress sync, reflections and reports.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- Display names. One per account.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null check (char_length(trim(handle)) between 2 and 32),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);
drop policy if exists "write own profile" on public.profiles;
create policy "write own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Likes, so each card can show how many people liked it.
create table if not exists public.likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  verse_key text not null check (char_length(verse_key) <= 16),
  created_at timestamptz not null default now(),
  primary key (user_id, verse_key)
);
alter table public.likes enable row level security;
drop policy if exists "likes are readable" on public.likes;
create policy "likes are readable" on public.likes for select using (true);
drop policy if exists "add own like" on public.likes;
create policy "add own like" on public.likes for insert with check (auth.uid() = user_id);
drop policy if exists "remove own like" on public.likes;
create policy "remove own like" on public.likes for delete using (auth.uid() = user_id);

-- Private per-person state: saved ayat and reading progress, synced across reinstalls.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  saves jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
drop policy if exists "own state only" on public.user_state;
create policy "own state only" on public.user_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reflections (comments) on an ayah.
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  verse_key text not null check (char_length(verse_key) <= 16),
  body text not null check (char_length(trim(body)) between 1 and 400),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reflections_verse on public.reflections (verse_key, created_at);
alter table public.reflections enable row level security;
drop policy if exists "visible reflections are readable" on public.reflections;
create policy "visible reflections are readable" on public.reflections for select using (not hidden or auth.uid() = user_id);
drop policy if exists "post own reflection" on public.reflections;
create policy "post own reflection" on public.reflections for insert with check (auth.uid() = user_id and hidden = false);
drop policy if exists "delete own reflection" on public.reflections;
create policy "delete own reflection" on public.reflections for delete using (auth.uid() = user_id);

-- Reports. Three different people reporting a reflection hides it until you review it in the dashboard.
create table if not exists public.reports (
  reflection_id uuid not null references public.reflections (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reflection_id, reporter_id)
);
alter table public.reports enable row level security;
drop policy if exists "file own report" on public.reports;
create policy "file own report" on public.reports for insert with check (auth.uid() = reporter_id);

create or replace function public.hide_after_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports where reflection_id = new.reflection_id) >= 3 then
    update public.reflections set hidden = true where id = new.reflection_id;
  end if;
  return new;
end $$;
drop trigger if exists hide_after_reports on public.reports;
create trigger hide_after_reports after insert on public.reports for each row execute function public.hide_after_reports();

-- Like and reflection counts for a set of cards, in one call.
create or replace function public.card_stats(keys text[])
returns table (verse_key text, likes bigint, reflections bigint)
language sql stable security definer set search_path = public as $$
  select k,
    (select count(*) from public.likes l where l.verse_key = k),
    (select count(*) from public.reflections r where r.verse_key = k and not r.hidden)
  from unnest(keys) as k;
$$;
grant execute on function public.card_stats(text[]) to anon, authenticated;
