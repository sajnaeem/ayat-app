-- Daily counts for AI features other than Ask (first: "Find a dua"). Only edge functions (service role) use it.
-- Never stores what people typed: just how many times per person per day.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  what text not null,
  count int not null default 0,
  primary key (user_id, day, what)
);
alter table public.ai_usage enable row level security;
-- No policies: the app can't read or change it.

create or replace function public.ai_take(p_uid uuid, p_what text, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.ai_usage (user_id, day, what, count) values (p_uid, current_date, p_what, 1)
  on conflict (user_id, day, what) do update set count = ai_usage.count + 1
  returning count into n;
  return n <= p_max;
end $$;
revoke all on function public.ai_take(uuid, text, int) from public, anon, authenticated;
