-- Together, 13 Nov 2026: ask for dua, khatms in memory of someone who has passed, and the ummah counter.
-- Every change goes through the functions below (tables have RLS on and no policies).

-- ============ Ask for dua ============
-- A short request, optionally without your name, shown for 14 days. Like reflections it goes live straight away
-- (the app's word filter runs first); 3 reports from different people hide it. Blocked people never see each other's.
create table if not exists public.dua_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 10 and 280),
  anonymous boolean not null default false,
  hidden boolean not null default false,
  dua_count int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index if not exists dua_requests_recent on public.dua_requests (created_at desc);
create index if not exists dua_requests_user on public.dua_requests (user_id);
alter table public.dua_requests enable row level security;

create table if not exists public.dua_made (
  request_id uuid not null references public.dua_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.dua_made enable row level security;

create table if not exists public.dua_reports (
  request_id uuid not null references public.dua_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.dua_reports enable row level security;

create or replace function public.ask_dua(p_body text, p_anonymous boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b text := trim(coalesce(p_body, ''));
  v_id uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me and guidelines_at is not null) then raise exception 'guidelines'; end if;
  if char_length(b) < 10 or char_length(b) > 280 then raise exception 'length'; end if;
  if (select count(*) from public.dua_requests where user_id = me and created_at > now() - interval '1 day') >= 3 then raise exception 'limit'; end if;
  insert into public.dua_requests (user_id, body, anonymous) values (me, b, coalesce(p_anonymous, false)) returning dua_requests.id into v_id;
  return v_id;
end $$;

-- The requests to pray for, newest first. Names only when the person chose to show theirs.
create or replace function public.dua_wall(p_before timestamptz default null, p_limit int default 30)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by (x->>'created_at') desc), '[]'::json) from (
    select json_build_object(
      'id', d.id, 'body', d.body, 'created_at', d.created_at, 'count', d.dua_count,
      'handle', case when d.anonymous then null else p.handle end,
      'author', case when d.anonymous then null else d.user_id end,
      'mine', d.user_id = (select auth.uid()),
      'made', exists (select 1 from public.dua_made m where m.request_id = d.id and m.user_id = (select auth.uid()))
    ) x
    from public.dua_requests d left join public.profiles p on p.id = d.user_id
    where not d.hidden and d.expires_at > now()
      and d.created_at < coalesce(p_before, now() + interval '1 minute')
      and ((select auth.uid()) is null or not public.blocked_between((select auth.uid()), d.user_id))
    order by d.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 50)
  ) t;
$$;

-- "I made dua for you": counted once per person. Returns the new count.
create or replace function public.made_dua(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n int;
begin
  if me is null then raise exception 'sign in first'; end if;
  if exists (select 1 from public.dua_requests d where d.id = p_id and d.user_id <> me and not d.hidden and not public.blocked_between(me, d.user_id)) then
    insert into public.dua_made (request_id, user_id) values (p_id, me) on conflict do nothing;
    if found then update public.dua_requests set dua_count = dua_count + 1 where id = p_id; end if;
  end if;
  select dua_count into n from public.dua_requests where id = p_id;
  return coalesce(n, 0);
end $$;

create or replace function public.report_dua(p_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  insert into public.dua_reports (request_id, user_id, reason) values (p_id, me, left(p_reason, 200)) on conflict do nothing;
  if found then
    update public.dua_requests set report_count = report_count + 1, hidden = (report_count + 1 >= 3) or hidden where id = p_id;
  end if;
end $$;

create or replace function public.delete_dua(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.dua_requests where id = p_id and user_id = (select auth.uid());
$$;

-- My own requests (including finished ones), with how many made dua.
create or replace function public.my_duas()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'id', d.id, 'body', d.body, 'anonymous', d.anonymous, 'count', d.dua_count, 'hidden', d.hidden,
    'created_at', d.created_at, 'expires_at', d.expires_at
  ) order by d.created_at desc), '[]'::json)
  from public.dua_requests d where d.user_id = (select auth.uid()) and d.created_at > now() - interval '60 days';
$$;

revoke all on function public.ask_dua(text, boolean) from public, anon;
revoke all on function public.made_dua(uuid) from public, anon;
revoke all on function public.report_dua(uuid, text) from public, anon;
revoke all on function public.delete_dua(uuid) from public, anon;
revoke all on function public.my_duas() from public, anon;
grant execute on function public.ask_dua(text, boolean), public.made_dua(uuid), public.report_dua(uuid, text), public.delete_dua(uuid), public.my_duas() to authenticated;
revoke all on function public.dua_wall(timestamptz, int) from public;
grant execute on function public.dua_wall(timestamptz, int) to anon, authenticated;

-- ============ Khatm in memory of someone ============
alter table public.khatms add column if not exists in_memory text check (in_memory is null or char_length(in_memory) <= 60);

drop function if exists public.create_khatm(text, text, date);
create or replace function public.create_khatm(p_title text, p_intention text default null, p_finish_by date default null, p_in_memory text default null)
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
  insert into public.khatms (code, title, intention, created_by, finish_by, in_memory)
  values (c, trim(p_title), nullif(trim(coalesce(p_intention, '')), ''), me, p_finish_by, nullif(left(trim(coalesce(p_in_memory, '')), 60), ''))
  returning id into k;
  insert into public.khatm_members (khatm_id, user_id) values (k, me);
  insert into public.khatm_parts (khatm_id, round, juz) select k, 1, g from generate_series(1, 30) g;
  return json_build_object('id', k, 'code', c);
end $$;
revoke all on function public.create_khatm(text, text, date, text) from public, anon;
grant execute on function public.create_khatm(text, text, date, text) to authenticated;

create or replace function public.khatm_preview(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', h.id, 'title', h.title, 'intention', h.intention, 'round', h.round, 'in_memory', h.in_memory,
    'members', (select count(*) from public.khatm_members m where m.khatm_id = h.id),
    'done', (select count(*) from public.khatm_parts p where p.khatm_id = h.id and p.round = h.round and p.status = 'done'),
    'open', (select count(*) from public.khatm_parts p where p.khatm_id = h.id and p.round = h.round and p.status = 'open'),
    'member', exists (select 1 from public.khatm_members m where m.khatm_id = h.id and m.user_id = (select auth.uid()))
  )
  from public.khatms h where h.code = upper(trim(p_code));
$$;

create or replace function public.khatm_detail(k uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when not public.is_khatm_member(k) then null else (
    select json_build_object(
      'id', h.id, 'code', h.code, 'title', h.title, 'intention', h.intention, 'round', h.round, 'in_memory', h.in_memory,
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

create or replace function public.my_khatms()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x->>'joined_at' desc), '[]'::json) from (
    select json_build_object(
      'id', h.id, 'title', h.title, 'round', h.round, 'completed_at', h.completed_at, 'joined_at', m.joined_at, 'in_memory', h.in_memory,
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

-- ============ The ummah counter ============
-- Only totals per day: never who read what.
create table if not exists public.ummah_reads (
  day date primary key,
  ayat bigint not null default 0
);
alter table public.ummah_reads enable row level security;

create or replace function public.add_ayat(n int)
returns void language sql security definer set search_path = public as $$
  insert into public.ummah_reads (day, ayat) select current_date, n where n between 1 and 60
  on conflict (day) do update set ayat = public.ummah_reads.ayat + excluded.ayat;
$$;

create or replace function public.ummah_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'today', coalesce((select ayat from public.ummah_reads where day = current_date), 0),
    'week', coalesce((select sum(ayat) from public.ummah_reads where day > current_date - 7), 0),
    'all', coalesce((select sum(ayat) from public.ummah_reads), 0)
  );
$$;
revoke all on function public.add_ayat(int) from public;
revoke all on function public.ummah_stats() from public;
grant execute on function public.add_ayat(int), public.ummah_stats() to anon, authenticated;
