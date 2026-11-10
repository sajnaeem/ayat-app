-- AI first pass on posts. The edge function "moderate" checks each new post and writes its verdict here.
-- A person still approves every post; the AI only sorts the queue, explains what to look at,
-- and turns down clear violations. Run after 006_posts.sql. Safe to run more than once.

alter table public.posts add column if not exists ai_verdict text check (ai_verdict is null or ai_verdict in ('ok', 'check', 'reject'));
alter table public.posts add column if not exists ai_summary text check (ai_summary is null or char_length(ai_summary) <= 300);
alter table public.posts add column if not exists ai_notes text check (ai_notes is null or char_length(ai_notes) <= 1000);
alter table public.posts add column if not exists ai_checked_at timestamptz;

-- Authors can't fill in the AI's verdict themselves: new posts must arrive with the AI columns empty.
drop policy if exists "create own post" on public.posts;
create policy "create own post" on public.posts for insert to authenticated with check (
  user_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null and review_note is null and hidden = false
  and ai_verdict is null and ai_summary is null and ai_notes is null and ai_checked_at is null
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.guidelines_at is not null)
  and (select count(*) from public.posts q where q.user_id = auth.uid() and q.status = 'pending') < 10
  and (media_path is null or split_part(media_path, '/', 1) = auth.uid()::text)
);
