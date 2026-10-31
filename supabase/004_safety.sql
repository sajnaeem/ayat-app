-- Community safety: agreeing to the community guidelines, and blocking people.
-- Run after 003_feedback.sql (SQL Editor → New query → paste → Run). Safe to run more than once.

-- When someone agreed to the community guidelines. Posting a reflection needs this.
alter table public.profiles add column if not exists guidelines_at timestamptz;

-- Blocks: "blocker" no longer sees "blocked", and the other way round.
create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
drop policy if exists "see own blocks" on public.blocks;
create policy "see own blocks" on public.blocks for select to authenticated using (auth.uid() = blocker);
drop policy if exists "add own block" on public.blocks;
create policy "add own block" on public.blocks for insert to authenticated with check (auth.uid() = blocker);
drop policy if exists "remove own block" on public.blocks;
create policy "remove own block" on public.blocks for delete to authenticated using (auth.uid() = blocker);

-- True if either person has blocked the other. (Runs with elevated rights so it can see both directions,
-- but only ever answers yes or no.)
create or replace function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke all on function public.blocked_between(uuid, uuid) from public, anon;
grant execute on function public.blocked_between(uuid, uuid) to authenticated;

-- Reflections: hidden ones and ones between blocked people are not shown.
drop policy if exists "visible reflections are readable" on public.reflections;
create policy "visible reflections are readable" on public.reflections for select to authenticated
  using ((not hidden or auth.uid() = user_id) and not public.blocked_between(auth.uid(), user_id));

-- Posting needs the guidelines agreed to.
drop policy if exists "post own reflection" on public.reflections;
create policy "post own reflection" on public.reflections for insert to authenticated
  with check (
    auth.uid() = user_id and hidden = false
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.guidelines_at is not null)
  );
