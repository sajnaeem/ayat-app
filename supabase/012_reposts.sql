-- Reposts: share someone's live post to your profile and to the people who follow you. No second review is needed,
-- because only approved posts can be reposted. Run after 011_search.sql. Safe to run more than once.

create table if not exists public.reposts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists reposts_by_user on public.reposts (user_id, created_at desc);
create index if not exists reposts_by_post on public.reposts (post_id);
alter table public.reposts enable row level security;

-- Reposts show on profiles, so anyone signed in can see them, except between people who've blocked each other.
-- (The post itself still goes through the posts rules, so a hidden or removed post never shows.)
drop policy if exists "read reposts" on public.reposts;
create policy "read reposts" on public.reposts for select to authenticated using (not public.blocked_between(auth.uid(), user_id));

-- Only live posts by someone else, never from someone you've blocked (or who's blocked you).
drop policy if exists "repost" on public.reposts;
create policy "repost" on public.reposts for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'approved' and not p.hidden and p.user_id <> auth.uid()
      and not public.blocked_between(auth.uid(), p.user_id)
  )
  and (select count(*) from public.reposts r where r.user_id = auth.uid() and r.created_at > now() - interval '1 day') < 100
);
drop policy if exists "undo repost" on public.reposts;
create policy "undo repost" on public.reposts for delete to authenticated using (user_id = auth.uid());
