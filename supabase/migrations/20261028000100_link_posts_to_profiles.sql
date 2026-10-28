-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. Give every existing user a profile. New users get one automatically
--    from the on_auth_user_created trigger.
insert into public.profiles (id, username)
select id, 'user_' || substr(id::text, 1, 8)
from auth.users
on conflict (id) do nothing;

-- 2. Point posts at profiles instead of auth.users, so the app can show
--    the author's username next to each post. Deleting a user deletes
--    their profile, which deletes their posts.
alter table public.posts
  drop constraint if exists posts_user_id_fkey,
  add constraint posts_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
