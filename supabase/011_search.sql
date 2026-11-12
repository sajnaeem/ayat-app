-- Search: find people by name (posts are searched straight from the posts table, which RLS already limits to
-- approved posts from people you haven't blocked). Run after 010_profiles_follows.sql. Safe to run more than once.

create extension if not exists pg_trgm with schema extensions;
create index if not exists profiles_handle_trgm on public.profiles using gin (lower(handle) extensions.gin_trgm_ops);
create index if not exists posts_body_trgm on public.posts using gin (lower(body) extensions.gin_trgm_ops) where status = 'approved' and not hidden;

-- People whose name contains the search, names starting with it first, then by followers. Signed-in only,
-- at least 2 letters, never people you've blocked or who've blocked you, and never yourself.
create or replace function public.search_people(q text)
returns table (id uuid, handle text, bio text, followers int, i_follow boolean)
language sql stable security definer set search_path = public as $$
  with s as (select lower(trim(q)) as t, replace(replace(replace(lower(trim(q)), '\', '\\'), '%', '\%'), '_', '\_') as e)
  select p.id, p.handle, p.bio,
    (select count(*)::int from public.follows f where f.followee = p.id) as followers,
    exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = p.id)
  from public.profiles p, s
  where auth.uid() is not null and char_length(s.t) between 2 and 40
    and p.handle is not null and lower(p.handle) like '%' || s.e || '%'
    and p.id <> auth.uid() and not public.blocked_between(auth.uid(), p.id)
  order by (lower(p.handle) like s.e || '%') desc, followers desc, p.handle
  limit 30;
$$;
revoke all on function public.search_people(text) from public, anon;
grant execute on function public.search_people(text) to authenticated;
