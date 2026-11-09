-- Posts: anyone with an account (who has agreed to the community guidelines) can post Islamic content.
-- Nothing is shown to anyone else until a reviewer approves it. Run after 005_waitlist.sql. Safe to run more than once.

-- Reviewers. Set only from the Supabase dashboard (Table Editor → profiles → is_reviewer), never from the app.
alter table public.profiles add column if not exists is_reviewer boolean not null default false;
-- The app may only write these profile columns, so nobody can make themselves a reviewer.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, handle, guidelines_at) on public.profiles to authenticated;
grant update (id, handle, guidelines_at) on public.profiles to authenticated;

create or replace function public.is_reviewer(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_reviewer from public.profiles where id = uid), false);
$$;
grant execute on function public.is_reviewer(uuid) to authenticated;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('text', 'image', 'video')),
  body text not null check (char_length(trim(body)) between 1 and 600),
  source text check (source is null or char_length(source) <= 160),
  moods text[] not null default '{}' check (cardinality(moods) <= 3),
  media_path text check (media_path is null or char_length(media_path) <= 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  review_note text check (review_note is null or char_length(review_note) <= 200),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check ((kind = 'text') = (media_path is null))
);
create index if not exists posts_feed on public.posts (status, created_at desc) where not hidden;
create index if not exists posts_author on public.posts (user_id, created_at desc);
alter table public.posts enable row level security;

-- Others see a post only once it's approved (and not hidden by reports, and nobody's blocked anybody).
-- Authors always see their own posts and their status; reviewers see everything.
drop policy if exists "read posts" on public.posts;
create policy "read posts" on public.posts for select to authenticated using (
  (status = 'approved' and not hidden and not public.blocked_between(auth.uid(), user_id))
  or user_id = auth.uid()
  or public.is_reviewer(auth.uid())
);

-- New posts always start as pending, need the guidelines agreed, and nobody can have more than 10 waiting at once.
drop policy if exists "create own post" on public.posts;
create policy "create own post" on public.posts for insert to authenticated with check (
  user_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null and review_note is null and hidden = false
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.guidelines_at is not null)
  and (select count(*) from public.posts q where q.user_id = auth.uid() and q.status = 'pending') < 10
  and (media_path is null or split_part(media_path, '/', 1) = auth.uid()::text)
);

drop policy if exists "delete own post" on public.posts;
create policy "delete own post" on public.posts for delete to authenticated using (user_id = auth.uid());
-- No update policy: authors can't edit a post after review, and status only changes through review_post().

create or replace function public.review_post(post uuid, approve boolean, note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_reviewer(auth.uid()) then
    raise exception 'not a reviewer';
  end if;
  update public.posts
    set status = case when approve then 'approved' else 'rejected' end,
        review_note = left(note, 200), reviewed_by = auth.uid(), reviewed_at = now(), hidden = false
    where id = post;
end $$;
revoke all on function public.review_post(uuid, boolean, text) from public, anon;
grant execute on function public.review_post(uuid, boolean, text) to authenticated;

-- Reports on posts. Three different people reporting a post hides it and sends it back to review.
create table if not exists public.post_reports (
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);
alter table public.post_reports enable row level security;
drop policy if exists "file own post report" on public.post_reports;
create policy "file own post report" on public.post_reports for insert to authenticated with check (auth.uid() = reporter_id);

create or replace function public.hide_post_after_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.post_reports where post_id = new.post_id) >= 3 then
    update public.posts set hidden = true, status = 'pending' where id = new.post_id;
  end if;
  return new;
end $$;
drop trigger if exists hide_post_after_reports on public.post_reports;
create trigger hide_post_after_reports after insert on public.post_reports for each row execute function public.hide_post_after_reports();
revoke execute on function public.hide_post_after_reports() from public, anon, authenticated;

-- Likes and comments on posts reuse likes and reflections with the key "p:<post id>" (38 characters).
alter table public.likes drop constraint if exists likes_verse_key_check;
alter table public.likes add constraint likes_verse_key_check check (char_length(verse_key) <= 48);
alter table public.reflections drop constraint if exists reflections_verse_key_check;
alter table public.reflections add constraint reflections_verse_key_check check (char_length(verse_key) <= 48);

-- Photos and videos: a private bucket, one folder per person, up to 50 MB each.
-- The app shows media through short-lived signed links, so removed posts' media stops loading.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', false, 52428800, array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "upload own post media" on storage.objects;
create policy "upload own post media" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own post media" on storage.objects;
create policy "delete own post media" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
-- Media can be read when its post can be read (approved, own, or by a reviewer).
drop policy if exists "read visible post media" on storage.objects;
create policy "read visible post media" on storage.objects for select to authenticated
  using (bucket_id = 'posts' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_reviewer(auth.uid())
    or exists (select 1 from public.posts p where p.media_path = name and p.status = 'approved' and not p.hidden and not public.blocked_between(auth.uid(), p.user_id))
  ));
