-- Games that developers submit to be discovered.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 2000),
  roblox_url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create index if not exists games_user_id_idx on public.games (user_id);

-- Row level security: anyone can browse games, but only the developer
-- who posted a game can add, change or delete it.
alter table public.games enable row level security;

create policy "Games are viewable by everyone"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "Users can add their own games"
  on public.games for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own games"
  on public.games for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own games"
  on public.games for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Thumbnails live in a public Storage bucket. Each user uploads into a
-- folder named after their user ID, so they can only touch their own files.
insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

create policy "Users can upload their own thumbnails"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own thumbnails"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
