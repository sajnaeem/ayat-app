-- Munib · Read together (group khatm)
--
-- A family or group shares one reading of the whole Quran: 30 juz, each claimed by a member
-- (or by a name, for someone reading from their own mushaf without the app), with progress
-- filled in automatically as the member reads in Munib.
--
-- Only members can see a khatm. Every change goes through the functions below (security
-- definer), so the rules live in one place; the tables have read policies only.

create table if not exists public.khatms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null check (char_length(title) between 1 and 60),
  intention text check (char_length(intention) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  round int not null default 1,
  rounds_done int not null default 0,
  finish_by date,
  completed_at timestamptz
);

create table if not exists public.khatm_members (
  khatm_id uuid not null references public.khatms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (khatm_id, user_id)
);
create index if not exists khatm_members_user on public.khatm_members (user_id);

create table if not exists public.khatm_parts (
  khatm_id uuid not null references public.khatms(id) on delete cascade,
  round int not null,
  juz smallint not null check (juz between 1 and 30),
  reader uuid references auth.users(id) on delete set null,
  reader_name text check (char_length(reader_name) between 1 and 40),
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'reading', 'done')),
  upto text check (upto ~ '^\d{1,3}:\d{1,3}$'),
  pct smallint not null default 0 check (pct between 0 and 100),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null,
  primary key (khatm_id, round, juz)
);
create index if not exists khatm_parts_reader on public.khatm_parts (reader);
create index if not exists khatm_parts_assigned_by on public.khatm_parts (assigned_by);
create index if not exists khatm_parts_done_by on public.khatm_parts (done_by);
create index if not exists khatms_created_by on public.khatms (created_by);

alter table public.khatms enable row level security;
alter table public.khatm_members enable row level security;
alter table public.khatm_parts enable row level security;

create or replace function public.is_khatm_member(k uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.khatm_members where khatm_id = k and user_id = (select auth.uid()));
$$;
revoke execute on function public.is_khatm_member(uuid) from public, anon;
grant execute on function public.is_khatm_member(uuid) to authenticated;

drop policy if exists "members read khatm" on public.khatms;
create policy "members read khatm" on public.khatms for select to authenticated using (public.is_khatm_member(id));
drop policy if exists "members read members" on public.khatm_members;
create policy "members read members" on public.khatm_members for select to authenticated using (public.is_khatm_member(khatm_id));
drop policy if exists "members read parts" on public.khatm_parts;
create policy "members read parts" on public.khatm_parts for select to authenticated using (public.is_khatm_member(khatm_id));

/* ---------- helpers ---------- */

create or replace function public.khatm_new_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.khatms where code = c);
  end loop;
  return c;
end $$;
revoke execute on function public.khatm_new_code() from public, anon, authenticated;

-- May this person change this part? The reader, whoever assigned it to a name, or the khatm's creator.
create or replace function public.khatm_may_edit(k uuid, r int, j int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.khatm_parts p join public.khatms h on h.id = p.khatm_id
    where p.khatm_id = k and p.round = r and p.juz = j
      and ((select auth.uid()) in (p.reader, p.assigned_by, h.created_by))
  ) and public.is_khatm_member(k);
$$;
revoke execute on function public.khatm_may_edit(uuid, int, int) from public, anon, authenticated;

/* ---------- create, join, leave ---------- */

create or replace function public.create_khatm(p_title text, p_intention text default null, p_finish_by date default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  k uuid;
  c text;
begin
  if me is null then raise exception 'sign in first'; end if;
  if (select count(*) from public.khatms where created_by = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'limit';
  end if;
  if (select count(*) from public.khatm_members where user_id = me) >= 20 then raise exception 'too many'; end if;
  c := public.khatm_new_code();
  insert into public.khatms (code, title, intention, created_by, finish_by)
  values (c, trim(p_title), nullif(trim(coalesce(p_intention, '')), ''), me, p_finish_by)
  returning id into k;
  insert into public.khatm_members (khatm_id, user_id) values (k, me);
  insert into public.khatm_parts (khatm_id, round, juz) select k, 1, g from generate_series(1, 30) g;
  return json_build_object('id', k, 'code', c);
end $$;

-- What an invite shows before joining. Safe for anyone with the code: no names.
create or replace function public.khatm_preview(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', h.id, 'title', h.title, 'intention', h.intention, 'round', h.round,
    'members', (select count(*) from public.khatm_members m where m.khatm_id = h.id),
    'done', (select count(*) from public.khatm_parts p where p.khatm_id = h.id and p.round = h.round and p.status = 'done'),
    'open', (select count(*) from public.khatm_parts p where p.khatm_id = h.id and p.round = h.round and p.status = 'open'),
    'member', exists (select 1 from public.khatm_members m where m.khatm_id = h.id and m.user_id = (select auth.uid()))
  )
  from public.khatms h where h.code = upper(trim(p_code));
$$;

create or replace function public.join_khatm(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  k uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  select id into k from public.khatms where code = upper(trim(p_code));
  if k is null then raise exception 'not found'; end if;
  if exists (select 1 from public.khatm_members where khatm_id = k and user_id = me) then return k; end if;
  if (select count(*) from public.khatm_members where khatm_id = k) >= 60 then raise exception 'full'; end if;
  if (select count(*) from public.khatm_members where user_id = me) >= 20 then raise exception 'too many'; end if;
  insert into public.khatm_members (khatm_id, user_id) values (k, me);
  return k;
end $$;

create or replace function public.leave_khatm(k uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  next_owner uuid;
begin
  if not public.is_khatm_member(k) then raise exception 'not a member'; end if;
  -- Unfinished parts they were reading go back to the group.
  update public.khatm_parts set reader = null, status = 'open', upto = null, pct = 0, updated_at = now()
  where khatm_id = k and reader = me and status <> 'done';
  delete from public.khatm_members where khatm_id = k and user_id = me;
  if not exists (select 1 from public.khatm_members where khatm_id = k) then
    delete from public.khatms where id = k;
  elsif (select created_by from public.khatms where id = k) = me then
    select user_id into next_owner from public.khatm_members where khatm_id = k order by joined_at limit 1;
    update public.khatms set created_by = next_owner where id = k;
  end if;
end $$;

create or replace function public.delete_khatm(k uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select created_by from public.khatms where id = k) is distinct from auth.uid() then raise exception 'only the creator'; end if;
  delete from public.khatms where id = k;
end $$;

/* ---------- parts ---------- */

-- Claim an open juz for yourself, or (with a name) for someone reading without the app.
create or replace function public.claim_juz(k uuid, j int, p_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r int;
  n text := nullif(trim(coalesce(p_name, '')), '');
begin
  if not public.is_khatm_member(k) then raise exception 'not a member'; end if;
  select round into r from public.khatms where id = k;
  update public.khatm_parts
  set reader = case when n is null then me end, reader_name = n, assigned_by = me,
      status = 'reading', upto = null, pct = 0, updated_at = now()
  where khatm_id = k and round = r and juz = j and status = 'open';
  if not found then raise exception 'taken'; end if;
end $$;

create or replace function public.release_juz(k uuid, j int)
returns void language plpgsql security definer set search_path = public as $$
declare r int;
begin
  select round into r from public.khatms where id = k;
  if not public.khatm_may_edit(k, r, j) then raise exception 'not yours'; end if;
  update public.khatm_parts
  set reader = null, reader_name = null, assigned_by = null, status = 'open', upto = null, pct = 0, done_at = null, done_by = null, updated_at = now()
  where khatm_id = k and round = r and juz = j;
  update public.khatms set completed_at = null where id = k;
end $$;

-- Progress as the reader reads in Munib: only ever moves forward.
create or replace function public.juz_progress(k uuid, j int, p_upto text, p_pct int)
returns void language plpgsql security definer set search_path = public as $$
declare r int;
begin
  select round into r from public.khatms where id = k;
  update public.khatm_parts
  set upto = p_upto, pct = least(99, greatest(pct, p_pct)), updated_at = now()
  where khatm_id = k and round = r and juz = j and reader = auth.uid() and status = 'reading' and p_pct > pct;
end $$;

create or replace function public.finish_juz(k uuid, j int, p_done boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare r int;
begin
  select round into r from public.khatms where id = k;
  if not public.khatm_may_edit(k, r, j) then raise exception 'not yours'; end if;
  if p_done then
    update public.khatm_parts set status = 'done', pct = 100, done_at = now(), done_by = auth.uid(), updated_at = now()
    where khatm_id = k and round = r and juz = j and status <> 'open';
    if (select count(*) from public.khatm_parts where khatm_id = k and round = r and status = 'done') = 30 then
      update public.khatms set completed_at = now(), rounds_done = rounds_done + 1 where id = k and completed_at is null;
    end if;
  else
    update public.khatm_parts set status = 'reading', pct = 0, done_at = null, done_by = null, updated_at = now()
    where khatm_id = k and round = r and juz = j and status = 'done';
    update public.khatms set completed_at = null, rounds_done = greatest(0, rounds_done - 1) where id = k and completed_at is not null;
  end if;
end $$;

-- Start the next khatm with the same group once all 30 are read.
create or replace function public.new_khatm_round(k uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r int;
begin
  if (select created_by from public.khatms where id = k) is distinct from auth.uid() then raise exception 'only the creator'; end if;
  if (select completed_at from public.khatms where id = k) is null then raise exception 'not finished'; end if;
  update public.khatms set round = round + 1, completed_at = null where id = k returning round into r;
  insert into public.khatm_parts (khatm_id, round, juz) select k, r, g from generate_series(1, 30) g;
end $$;

/* ---------- reading ---------- */

create or replace function public.khatm_detail(k uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when not public.is_khatm_member(k) then null else (
    select json_build_object(
      'id', h.id, 'code', h.code, 'title', h.title, 'intention', h.intention, 'round', h.round,
      'rounds_done', h.rounds_done, 'finish_by', h.finish_by, 'completed_at', h.completed_at,
      'created_at', h.created_at, 'creator', h.created_by,
      'members', (
        select coalesce(json_agg(json_build_object('id', m.user_id, 'handle', pr.handle) order by m.joined_at), '[]'::json)
        from public.khatm_members m left join public.profiles pr on pr.id = m.user_id where m.khatm_id = h.id
      ),
      'parts', (
        select json_agg(json_build_object(
          'juz', p.juz, 'reader', p.reader, 'handle', pr.handle, 'name', p.reader_name, 'by', p.assigned_by,
          'status', p.status, 'upto', p.upto, 'pct', p.pct, 'updated_at', p.updated_at, 'done_at', p.done_at
        ) order by p.juz)
        from public.khatm_parts p left join public.profiles pr on pr.id = p.reader
        where p.khatm_id = h.id and p.round = h.round
      )
    ) from public.khatms h where h.id = k
  ) end;
$$;

-- The khatms I'm in, with my own parts, for the list and for tracking what I read.
create or replace function public.my_khatms()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x->>'joined_at' desc), '[]'::json) from (
    select json_build_object(
      'id', h.id, 'title', h.title, 'round', h.round, 'completed_at', h.completed_at, 'joined_at', m.joined_at,
      'members', (select count(*) from public.khatm_members mm where mm.khatm_id = h.id),
      'done', (select count(*) from public.khatm_parts p where p.khatm_id = h.id and p.round = h.round and p.status = 'done'),
      'mine', (
        select coalesce(json_agg(json_build_object('juz', p.juz, 'status', p.status, 'upto', p.upto, 'pct', p.pct) order by p.juz), '[]'::json)
        from public.khatm_parts p where p.khatm_id = h.id and p.round = h.round and p.reader = m.user_id
      )
    ) x
    from public.khatm_members m join public.khatms h on h.id = m.khatm_id
    where m.user_id = (select auth.uid())
  ) t;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'create_khatm(text, text, date)', 'join_khatm(text)', 'leave_khatm(uuid)', 'delete_khatm(uuid)',
    'claim_juz(uuid, int, text)', 'release_juz(uuid, int)', 'juz_progress(uuid, int, text, int)',
    'finish_juz(uuid, int, boolean)', 'new_khatm_round(uuid)', 'khatm_detail(uuid)', 'my_khatms()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- The invite preview is also read by the website's /k/<code> page, without an account.
revoke execute on function public.khatm_preview(text) from public;
grant execute on function public.khatm_preview(text) to anon, authenticated;
