-- In-app feedback: bug reports and ideas. Run after 002_accounts.sql (SQL Editor → New query → paste → Run).
-- People can send feedback but never read it back; you read it in Table Editor → feedback.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(trim(message)) between 1 and 4000),
  meta jsonb not null default '{}'::jsonb,
  screenshot text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "send own feedback" on public.feedback;
create policy "send own feedback" on public.feedback for insert to authenticated with check (user_id = auth.uid());

-- Screenshots go in a private storage bucket, one folder per person.
insert into storage.buckets (id, name, public) values ('feedback', 'feedback', false) on conflict (id) do nothing;
drop policy if exists "upload own feedback screenshots" on storage.objects;
create policy "upload own feedback screenshots" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);
