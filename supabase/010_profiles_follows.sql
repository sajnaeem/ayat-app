-- Profiles and following: a short bio, following people who post, and the counts on a profile.
-- Run after 009_mosques.sql. Safe to run more than once.
--
-- Privacy: anyone signed in can see a profile's counts (posts, followers, following), but the lists of who
-- follows whom are only visible to the two people involved (your own followers and who you follow).
-- Blocking someone removes any follow between you, and blocked people can't see each other's profiles.

alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 150);
grant insert (bio) on public.profiles to authenticated;
grant update (bio) on public.profiles to authenticated;

create table if not exists public.follows (
  follower uuid not null references public.profiles (id) on delete cascade,
  followee uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee on public.follows (followee, created_at desc);
alter table public.follows enable row level security;

drop policy if exists "see own follows" on public.follows;
create policy "see own follows" on public.follows for select to authenticated
  using (follower = auth.uid() or followee = auth.uid());
drop policy if exists "follow someone" on public.follows;
create policy "follow someone" on public.follows for insert to authenticated
  with check (follower = auth.uid() and not public.blocked_between(follower, followee)
    and (select count(*) from public.follows f where f.follower = auth.uid()) < 2000);
-- Unfollow, or remove someone who follows you.
drop policy if exists "unfollow" on public.follows;
create policy "unfollow" on public.follows for delete to authenticated
  using (follower = auth.uid() or followee = auth.uid());

-- Blocking ends any follow in either direction.
create or replace function public.unfollow_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows where (follower = new.blocker and followee = new.blocked) or (follower = new.blocked and followee = new.blocker);
  return new;
end $$;
revoke all on function public.unfollow_on_block() from public, anon, authenticated;
drop trigger if exists unfollow_on_block on public.blocks;
create trigger unfollow_on_block after insert on public.blocks for each row execute function public.unfollow_on_block();

-- One profile, as the person asking sees it. Nothing comes back if either has blocked the other.
create or replace function public.profile_card(uid uuid)
returns table (id uuid, handle text, bio text, posts int, followers int, following int, i_follow boolean, follows_me boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, p.bio,
    (select count(*)::int from public.posts q where q.user_id = p.id and q.status = 'approved' and not q.hidden),
    (select count(*)::int from public.follows f where f.followee = p.id),
    (select count(*)::int from public.follows f where f.follower = p.id),
    exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = p.id),
    exists (select 1 from public.follows f where f.follower = p.id and f.followee = auth.uid())
  from public.profiles p
  where p.id = uid and auth.uid() is not null and not public.blocked_between(auth.uid(), p.id);
$$;
revoke all on function public.profile_card(uuid) from public, anon;
grant execute on function public.profile_card(uuid) to authenticated;
