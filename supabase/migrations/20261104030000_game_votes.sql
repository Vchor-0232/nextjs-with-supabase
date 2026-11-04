-- Likes and dislikes made on Gamesprout (one per person per game).
-- Game pages show Roblox's counts plus these.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table public.game_votes (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  is_like boolean not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index game_votes_game_id_idx on public.game_votes (game_id);

alter table public.game_votes enable row level security;

create policy "Votes are public" on public.game_votes
  for select using (true);
create policy "Vote as yourself" on public.game_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change your vote" on public.game_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Remove your vote" on public.game_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Changing a vote may only flip like/dislike.
revoke update on public.game_votes from anon, authenticated;
grant update (is_like) on public.game_votes to authenticated;
