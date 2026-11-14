-- Munib · anonymous usage stats and opt-in insights (Saj, 14 Nov 2026: "collecting data is important as a future
-- business… selling insights"). Nothing here can be tied to a person: no user id, no device id, no IP, no location.
--
-- Each phone sends one row per day it was used (the day after, or when the app next opens): which features were
-- opened, how many ayat were read, minutes in the app, the week it was installed (for retention), country from the
-- phone's region setting, platform and app version. Readers can switch this off (You → Privacy).
-- Journey answers (new to Islam, Arabic reading, goals…) are only attached when the reader turns on "Share anonymous
-- insights" (off by default): explicit consent, because they touch on religion.
-- The phone attaches journey answers once (and again only if they change), so they count people, not days.
-- Only totals are ever shown or sold: usage_summary() is for reviewers, and every grouped figure hides groups under 20.

create table if not exists public.usage_days (
  id bigint generated always as identity primary key,
  day date not null,
  cohort date not null,                 -- Monday of the week Munib was installed
  age int not null,                     -- days since install
  country text,                         -- two letters, from the phone's region setting
  platform text not null,
  version text,
  features text[] not null default '{}',
  ayat int not null default 0,
  minutes int not null default 0,
  journey jsonb,                        -- only with "Share anonymous insights" on
  created_at timestamptz not null default now()
);
create index if not exists usage_days_day on public.usage_days (day);
create index if not exists usage_days_cohort on public.usage_days (cohort, age);
alter table public.usage_days enable row level security;
-- No policies: nobody reads or writes the table directly. Rows come in through log_usage(), totals go out through usage_summary().

create or replace function public.log_usage(rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 7 then return; end if;
  for r in select * from jsonb_array_elements(rows) loop
    if (r->>'day')::date between current_date - 8 and current_date
       and (r->>'cohort')::date between date '2026-10-01' and current_date
       and coalesce((r->>'age')::int, -1) between 0 and 3650
       and coalesce(r->>'platform', '') in ('ios', 'android', 'web') then
      insert into public.usage_days (day, cohort, age, country, platform, version, features, ayat, minutes, journey)
      values (
        (r->>'day')::date, (r->>'cohort')::date, (r->>'age')::int,
        case when r->>'country' ~ '^[A-Z]{2}$' then r->>'country' end,
        r->>'platform', left(r->>'version', 12),
        (coalesce((select array_agg(distinct f) from jsonb_array_elements_text(r->'features') f where f ~ '^[a-z_]{2,24}$'), '{}'::text[]))[1:40],
        least(greatest(coalesce((r->>'ayat')::int, 0), 0), 2000),
        least(greatest(coalesce((r->>'minutes')::int, 0), 0), 1440),
        case when jsonb_typeof(r->'journey') = 'object' then r->'journey' end
      );
    end if;
  end loop;
end $$;

-- Totals for Munib's own dashboard (reviewers only). Groups under 20 are left out of the breakdowns.
create or replace function public.usage_summary(days int default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare out json;
begin
  if not public.is_reviewer(auth.uid()) then return null; end if;
  select json_build_object(
    'daily', (select json_agg(x order by x.day) from (select day, count(*) as users, sum(ayat) as ayat, round(avg(minutes)) as minutes
              from public.usage_days where day > current_date - days group by day) x),
    'features', (select json_agg(x order by x.users desc) from (select f as feature, count(*) as users
              from public.usage_days, unnest(features) f where day > current_date - days group by f having count(*) >= 20) x),
    'countries', (select json_agg(x order by x.users desc) from (select country, count(*) as users
              from public.usage_days where day > current_date - days and country is not null group by country having count(*) >= 20) x),
    -- retention: phones in each install week used on their first day, and again on day 1, day 7 and day 30
    'retention', (select json_agg(x order by x.cohort) from (select cohort,
                count(*) filter (where age = 0) as d0, count(*) filter (where age = 1) as d1,
                count(*) filter (where age = 7) as d7, count(*) filter (where age = 30) as d30
              from public.usage_days group by cohort) x),
    'journey', (select json_agg(x order by x.users desc) from (select k as question, v as answer, count(*) as users
              from public.usage_days, jsonb_each_text(journey) j(k, v) where journey is not null
              group by k, v having count(*) >= 20) x)
  ) into out;
  return out;
end $$;

revoke all on function public.log_usage(jsonb) from public;
revoke all on function public.usage_summary(int) from public;
grant execute on function public.log_usage(jsonb) to anon, authenticated;
grant execute on function public.usage_summary(int) to authenticated;
