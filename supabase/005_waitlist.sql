-- Waitlist for getmunib.com: people can add their email; nobody can read the list except you (Table Editor → waitlist).
create table if not exists public.waitlist (
  email text primary key check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
drop policy if exists "join the waitlist" on public.waitlist;
create policy "join the waitlist" on public.waitlist for insert to anon, authenticated with check (true);
