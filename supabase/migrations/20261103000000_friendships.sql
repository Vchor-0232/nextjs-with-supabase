-- Friends for the Home page. The other tables it reads (games, tags,
-- game_tags, ratings, game_views, game_stats) already exist in Supabase.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- A request starts as 'pending'; the other person accepts it.
create table public.friendships (
  requester_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Only one friendship per pair, whoever asked first.
create unique index friendships_pair_key on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;

create policy "See own friendships" on public.friendships
  for select to authenticated using (
    (select auth.uid()) in (requester_id, addressee_id)
  );
create policy "Send friend requests" on public.friendships
  for insert to authenticated with check (
    (select auth.uid()) = requester_id and status = 'pending'
  );
create policy "Accept requests sent to you" on public.friendships
  for update to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = addressee_id);
create policy "Remove a friendship" on public.friendships
  for delete to authenticated using (
    (select auth.uid()) in (requester_id, addressee_id)
  );

-- Accepting a request may only change its status, not who it's between.
revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;
