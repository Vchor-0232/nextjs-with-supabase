-- Followers / Following and Favorite Games for the Profile page.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- Who follows whom. Following doesn't need the other person to accept.
create table public.follows (
  follower_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- Follower counts are public, like on most sites.
create policy "Follows are public" on public.follows
  for select using (true);
create policy "Follow as yourself" on public.follows
  for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "Unfollow as yourself" on public.follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- Games a user has favorited.
create table public.favorite_games (
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index favorite_games_game_id_idx on public.favorite_games (game_id);

alter table public.favorite_games enable row level security;

create policy "Favorites are public" on public.favorite_games
  for select using (true);
create policy "Favorite as yourself" on public.favorite_games
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Unfavorite as yourself" on public.favorite_games
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Nothing to edit in either table: you add or remove a row.
revoke update on public.follows, public.favorite_games from anon, authenticated;
