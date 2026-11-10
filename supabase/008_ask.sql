-- "Ask about this ayah": a daily limit per person. Only the edge function "ask" (service role) reads or writes this.
-- We store how many questions someone asked each day, never the questions or answers. Run after 007_ai_review.sql.

create table if not exists public.ask_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ask_usage enable row level security;
-- No policies: the app can't read or change it. The service role (used by the edge function) bypasses RLS.

-- Counts one question and says whether it's within today's limit.
create or replace function public.ask_take(uid uuid, max_per_day int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.ask_usage (user_id, day, count) values (uid, current_date, 1)
  on conflict (user_id, day) do update set count = ask_usage.count + 1
  returning count into n;
  return n <= max_per_day;
end $$;
revoke all on function public.ask_take(uuid, int) from public, anon, authenticated;

-- Answers to the three starter questions are the same for everyone, so each is written once and kept.
-- (Personal questions are never stored.) To have one rewritten, delete its row in Table Editor → ask_cache.
create table if not exists public.ask_cache (
  key text primary key,            -- "2:268#0": ayah and starter number
  answer text not null,
  model text not null,
  created_at timestamptz not null default now()
);
alter table public.ask_cache enable row level security;
-- No policies: only the edge function (service role) reads and writes it.
