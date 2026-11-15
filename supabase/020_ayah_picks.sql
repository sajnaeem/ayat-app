-- More ayat for For you (Saj, 15 Nov 2026: "keep populating the For you tab"; option 2).
-- Claude reads the Quran surah by surah and suggests ayat that stand well on their own, each with up to 3 moods,
-- a one-line note and its reason (edge function `curate`). A reviewer approves or turns each one down in the app
-- (src/app/curate.tsx). Only approved ayat reach readers' feeds. Nothing about readers is stored here.

create table if not exists public.ayah_picks (
  id bigint generated always as identity primary key,
  s int not null check (s between 1 and 114),
  a int not null check (a >= 1),
  b int not null check (b >= a and b - a < 4),
  moods text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 160),
  why text not null default '',
  -- The text as it was suggested (quran-json 3.1.2: Uthmani Arabic, Saheeh International, transliteration), so the
  -- reviewer sees exactly what readers will, and the feed can show it before the surah has loaded.
  ar jsonb not null,
  tl jsonb not null default '[]',
  en jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  suggested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  unique (s, a, b)
);
create index if not exists ayah_picks_status on public.ayah_picks (status, s, a);
alter table public.ayah_picks enable row level security;

-- Everyone (guests too) can read approved picks: they are public Quran text with Munib's note.
drop policy if exists "approved picks are public" on public.ayah_picks;
create policy "approved picks are public" on public.ayah_picks for select to anon, authenticated using (status = 'approved');
-- Reviewers can read everything, to review it.
drop policy if exists "reviewers read all picks" on public.ayah_picks;
create policy "reviewers read all picks" on public.ayah_picks for select to authenticated using (public.is_reviewer(auth.uid()));
-- No insert/update/delete policies: suggestions come from the function (service role), decisions through review_pick().

-- Where the next suggestions start: one row.
create table if not exists public.curate_progress (
  id int primary key default 1 check (id = 1),
  s int not null default 1,
  a int not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.curate_progress (id) values (1) on conflict do nothing;
alter table public.curate_progress enable row level security;
drop policy if exists "reviewers read progress" on public.curate_progress;
create policy "reviewers read progress" on public.curate_progress for select to authenticated using (public.is_reviewer(auth.uid()));

create or replace function public.review_pick(pick bigint, approve boolean, p_moods text[] default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_reviewer(auth.uid()) then
    raise exception 'not a reviewer';
  end if;
  update public.ayah_picks set
    status = case when approve then 'approved' else 'rejected' end,
    moods = coalesce(p_moods[1:3], moods),
    note = coalesce(left(p_note, 160), note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = pick;
end $$;
revoke all on function public.review_pick(bigint, boolean, text[], text) from public, anon;
grant execute on function public.review_pick(bigint, boolean, text[], text) to authenticated;

-- Counts for the reviewer screen.
create or replace function public.pick_counts() returns json
language sql security definer set search_path = public stable as $$
  select case when public.is_reviewer(auth.uid()) then json_build_object(
    'pending', (select count(*) from public.ayah_picks where status = 'pending'),
    'approved', (select count(*) from public.ayah_picks where status = 'approved'),
    'rejected', (select count(*) from public.ayah_picks where status = 'rejected'),
    'at', (select json_build_object('s', s, 'a', a) from public.curate_progress where id = 1)
  ) end;
$$;
revoke all on function public.pick_counts() from public, anon;
grant execute on function public.pick_counts() to authenticated;
