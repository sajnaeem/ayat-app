-- Munib · Circles: small private groups for a family or a few friends (Together tab).
--
-- Two kinds, sharing these tables:
--   family   one shared ayah a day; the circle sees HOW MANY have read today (a count, never who),
--            and members can send each other a salaam.
--   ramadan  everyone reads the Quran through Ramadan, a juz a day; each member ticks the juz they have
--            read, and the circle sees how many have read today's juz and the circle's total.
--
-- Only members can see a circle. Every change goes through the functions below (security definer);
-- the tables have read policies only, and marks/salaams are never readable directly (so nobody can
-- work out who has or hasn't read: the functions only ever return counts and the reader's own marks).

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('family', 'ramadan')),
  title text not null check (char_length(title) between 1 and 40),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- ramadan: the first day of fasting for this circle (moon sighting differs, so the circle chooses)
  starts date
);
create index if not exists circles_created_by on public.circles (created_by);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index if not exists circle_members_user on public.circle_members (user_id);

-- family: k is the day as a number, 20270214. ramadan: k is the juz, 1 to 30.
create table if not exists public.circle_marks (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  k int not null,
  at timestamptz not null default now(),
  primary key (circle_id, user_id, k)
);
create index if not exists circle_marks_user on public.circle_marks (user_id);

create table if not exists public.circle_salaams (
  circle_id uuid not null references public.circles(id) on delete cascade,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  seen boolean not null default false,
  primary key (circle_id, from_id, to_id, day)
);
create index if not exists circle_salaams_to on public.circle_salaams (to_id, seen);
create index if not exists circle_salaams_from on public.circle_salaams (from_id);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_marks enable row level security;
alter table public.circle_salaams enable row level security;

create or replace function public.is_circle_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members where circle_id = c and user_id = (select auth.uid()));
$$;
revoke execute on function public.is_circle_member(uuid) from public, anon;
grant execute on function public.is_circle_member(uuid) to authenticated;

drop policy if exists "members read circle" on public.circles;
create policy "members read circle" on public.circles for select to authenticated using (public.is_circle_member(id));
drop policy if exists "members read circle members" on public.circle_members;
create policy "members read circle members" on public.circle_members for select to authenticated using (public.is_circle_member(circle_id));
-- Marks and salaams: your own rows only. Everything about the group comes from the functions, as counts.
drop policy if exists "own marks" on public.circle_marks;
create policy "own marks" on public.circle_marks for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own salaams" on public.circle_salaams;
create policy "own salaams" on public.circle_salaams for select to authenticated using (to_id = (select auth.uid()) or from_id = (select auth.uid()));

/* ---------- helpers ---------- */

create or replace function public.circle_new_code() returns text
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
    exit when not exists (select 1 from public.circles where code = c) and not exists (select 1 from public.khatms where code = c);
  end loop;
  return c;
end $$;
revoke execute on function public.circle_new_code() from public, anon, authenticated;

-- Today's mark for a circle on the reader's own date: the day number (family) or the juz of the day (ramadan, null outside it).
create or replace function public.circle_today(p_kind text, p_starts date, p_date date) returns int
language sql immutable set search_path = public as $$
  select case
    when p_kind = 'family' then to_char(p_date, 'YYYYMMDD')::int
    when p_starts is not null and p_date - p_starts between 0 and 29 then p_date - p_starts + 1
    else null end;
$$;
revoke execute on function public.circle_today(text, date, date) from public, anon, authenticated;

/* ---------- create, join, leave ---------- */

create or replace function public.create_circle(p_kind text, p_title text, p_starts date default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c uuid;
  code text;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_kind not in ('family', 'ramadan') then raise exception 'kind'; end if;
  if p_kind = 'ramadan' and (p_starts is null or p_starts < current_date - 40 or p_starts > current_date + 400) then raise exception 'starts'; end if;
  if (select count(*) from public.circles where created_by = me and created_at > now() - interval '1 day') >= 5 then raise exception 'limit'; end if;
  if (select count(*) from public.circle_members where user_id = me) >= 12 then raise exception 'too many'; end if;
  code := public.circle_new_code();
  insert into public.circles (code, kind, title, created_by, starts)
  values (code, p_kind, trim(p_title), me, case when p_kind = 'ramadan' then p_starts end)
  returning id into c;
  insert into public.circle_members (circle_id, user_id) values (c, me);
  return json_build_object('id', c, 'code', code);
end $$;

-- What an invite shows before joining. Safe for anyone with the code: no names.
create or replace function public.circle_preview(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', c.id, 'kind', c.kind, 'title', c.title, 'starts', c.starts,
    'members', (select count(*) from public.circle_members m where m.circle_id = c.id),
    'member', exists (select 1 from public.circle_members m where m.circle_id = c.id and m.user_id = (select auth.uid()))
  )
  from public.circles c where c.code = upper(trim(p_code));
$$;

create or replace function public.join_circle(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  select id into c from public.circles where code = upper(trim(p_code));
  if c is null then raise exception 'not found'; end if;
  if exists (select 1 from public.circle_members where circle_id = c and user_id = me) then return c; end if;
  if (select count(*) from public.circle_members where circle_id = c) >= 30 then raise exception 'full'; end if;
  if (select count(*) from public.circle_members where user_id = me) >= 12 then raise exception 'too many'; end if;
  insert into public.circle_members (circle_id, user_id) values (c, me);
  return c;
end $$;

create or replace function public.leave_circle(c uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.is_circle_member(c) then raise exception 'not a member'; end if;
  delete from public.circle_marks where circle_id = c and user_id = me;
  delete from public.circle_salaams where circle_id = c and (from_id = me or to_id = me);
  delete from public.circle_members where circle_id = c and user_id = me;
end $$;

create or replace function public.delete_circle(c uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select created_by from public.circles where id = c) is distinct from auth.uid() then raise exception 'only the creator'; end if;
  delete from public.circles where id = c;
end $$;

-- The creator can move the first day of Ramadan (the moon was sighted a day earlier or later).
create or replace function public.set_circle_start(c uuid, p_starts date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select created_by from public.circles where id = c and kind = 'ramadan') is distinct from auth.uid() then raise exception 'only the creator'; end if;
  if p_starts is null or p_starts < current_date - 40 or p_starts > current_date + 400 then raise exception 'starts'; end if;
  update public.circles set starts = p_starts where id = c;
end $$;

/* ---------- reading ---------- */

-- Tick (or untick) today's ayah (family: k is the day number, today give or take a day for time zones)
-- or a juz (ramadan: 1 to 30).
create or replace function public.mark_circle(c uuid, p_k int, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_kind text;
begin
  if not public.is_circle_member(c) then raise exception 'not a member'; end if;
  select x.kind into v_kind from public.circles x where x.id = c;
  if v_kind = 'family' then
    if p_k not in (to_char(current_date - 1, 'YYYYMMDD')::int, to_char(current_date, 'YYYYMMDD')::int, to_char(current_date + 1, 'YYYYMMDD')::int) then raise exception 'day'; end if;
  elsif p_k not between 1 and 30 then raise exception 'juz';
  end if;
  if p_on then
    insert into public.circle_marks (circle_id, user_id, k) values (c, me, p_k) on conflict do nothing;
  else
    delete from public.circle_marks m where m.circle_id = c and m.user_id = me and m.k = p_k;
  end if;
end $$;

-- One salaam a day from one member to another. Shown to them inside Munib the next time they open the circle.
create or replace function public.send_salaam(c uuid, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.is_circle_member(c) then raise exception 'not a member'; end if;
  if p_to = me or not exists (select 1 from public.circle_members where circle_id = c and user_id = p_to) then raise exception 'not a member'; end if;
  if exists (select 1 from public.blocks b where (b.blocker = me and b.blocked = p_to) or (b.blocker = p_to and b.blocked = me)) then return; end if;
  if (select count(*) from public.circle_salaams where from_id = me and day = current_date) >= 40 then raise exception 'limit'; end if;
  insert into public.circle_salaams (circle_id, from_id, to_id) values (c, me, p_to) on conflict do nothing;
end $$;

create or replace function public.seen_salaams(c uuid)
returns void language sql security definer set search_path = public as $$
  update public.circle_salaams set seen = true where circle_id = c and to_id = (select auth.uid()) and not seen;
$$;

-- One circle, for a member. p_date is the reader's own date. Group numbers are counts only.
create or replace function public.circle_detail(c uuid, p_date date)
returns json language sql stable security definer set search_path = public as $$
  select case when not public.is_circle_member(c) then null else (
    select json_build_object(
      'id', x.id, 'code', x.code, 'kind', x.kind, 'title', x.title, 'starts', x.starts, 'creator', x.created_by,
      'today', public.circle_today(x.kind, x.starts, p_date),
      'members', (
        select coalesce(json_agg(json_build_object('id', m.user_id, 'handle', pr.handle) order by m.joined_at), '[]'::json)
        from public.circle_members m left join public.profiles pr on pr.id = m.user_id where m.circle_id = x.id
      ),
      'read_today', (select count(*) from public.circle_marks k where k.circle_id = x.id and k.k = public.circle_today(x.kind, x.starts, p_date)),
      'total', (select count(*) from public.circle_marks k where k.circle_id = x.id),
      'mine', (select coalesce(json_agg(q.k order by q.k), '[]'::json) from (select mk.k from public.circle_marks mk where mk.circle_id = x.id and mk.user_id = (select auth.uid()) order by mk.k desc limit 60) q),
      'salaams', (
        select coalesce(json_agg(json_build_object('from', s.from_id, 'handle', pr.handle) order by s.day), '[]'::json)
        from public.circle_salaams s left join public.profiles pr on pr.id = s.from_id
        where s.circle_id = x.id and s.to_id = (select auth.uid()) and not s.seen
      ),
      'sent', (select coalesce(json_agg(s.to_id), '[]'::json) from public.circle_salaams s where s.circle_id = x.id and s.from_id = (select auth.uid()) and s.day >= p_date - 1)
    ) from public.circles x where x.id = c
  ) end;
$$;

-- The circles I'm in, for the list.
create or replace function public.my_circles(p_date date)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t.x order by t.x->>'joined_at' desc), '[]'::json) from (
    select json_build_object(
      'id', x.id, 'kind', x.kind, 'title', x.title, 'starts', x.starts, 'joined_at', m.joined_at,
      'today', public.circle_today(x.kind, x.starts, p_date),
      'members', (select count(*) from public.circle_members mm where mm.circle_id = x.id),
      'read_today', (select count(*) from public.circle_marks k where k.circle_id = x.id and k.k = public.circle_today(x.kind, x.starts, p_date)),
      'i_read', exists (select 1 from public.circle_marks k where k.circle_id = x.id and k.user_id = m.user_id and k.k = public.circle_today(x.kind, x.starts, p_date)),
      'my_count', (select count(*) from public.circle_marks k where k.circle_id = x.id and k.user_id = m.user_id),
      'salaams', (select count(*) from public.circle_salaams s where s.circle_id = x.id and s.to_id = m.user_id and not s.seen)
    ) x
    from public.circle_members m join public.circles x on x.id = m.circle_id
    where m.user_id = (select auth.uid())
  ) t;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'create_circle(text, text, date)', 'join_circle(text)', 'leave_circle(uuid)', 'delete_circle(uuid)', 'set_circle_start(uuid, date)',
    'mark_circle(uuid, int, boolean)', 'send_salaam(uuid, uuid)', 'seen_salaams(uuid)', 'circle_detail(uuid, date)', 'my_circles(date)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- The invite preview is also read by the website's /c/<code> page, without an account.
revoke execute on function public.circle_preview(text) from public;
grant execute on function public.circle_preview(text) to anon, authenticated;

-- When someone leaves or deletes their account, a circle they started passes to the longest-standing
-- member, and a circle with nobody left is removed.
create or replace function public.circle_member_gone() returns trigger
language plpgsql security definer set search_path = public as $$
declare next_owner uuid;
begin
  if not exists (select 1 from public.circle_members where circle_id = old.circle_id) then
    delete from public.circles where id = old.circle_id;
  elsif (select created_by is null or created_by = old.user_id from public.circles where id = old.circle_id) then
    select user_id into next_owner from public.circle_members where circle_id = old.circle_id order by joined_at limit 1;
    update public.circles set created_by = next_owner where id = old.circle_id;
  end if;
  return null;
end $$;
revoke execute on function public.circle_member_gone() from public, anon, authenticated;
drop trigger if exists circle_member_gone on public.circle_members;
create trigger circle_member_gone after delete on public.circle_members for each row execute function public.circle_member_gone();
