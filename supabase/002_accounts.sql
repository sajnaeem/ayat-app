-- Accounts are required. Run this after schema.sql (SQL Editor → New query → paste → Run). Safe to run more than once.

-- Lets someone delete their own account from inside the app (Apple requires this).
-- Deleting the auth user removes their profile, likes, saved ayat, progress and reflections through the cascades in schema.sql.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Only signed-in people can see reflections, profiles and like counts.
drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select to authenticated using (true);
drop policy if exists "likes are readable" on public.likes;
create policy "likes are readable" on public.likes for select to authenticated using (true);
drop policy if exists "visible reflections are readable" on public.reflections;
create policy "visible reflections are readable" on public.reflections for select to authenticated using (not hidden or auth.uid() = user_id);
revoke execute on function public.card_stats(text[]) from anon;
