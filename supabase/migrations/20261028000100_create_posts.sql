-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. Give every existing user a profile. New users get one automatically
--    from the on_auth_user_created trigger.
insert into public.profiles (id, username)
select id, 'user_' || substr(id::text, 1, 8)
from auth.users
on conflict (id) do nothing;

-- 2. Posts belong to a profile, so the app can show the author's username.
--    Deleting a user deletes their profile, which deletes their posts.
create table public.posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000)
);

create index posts_user_id_idx on public.posts (user_id);

alter table public.posts enable row level security;

create policy "Users insert own posts" on public.posts
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users read own posts" on public.posts
  for select to authenticated using ((select auth.uid()) = user_id);
