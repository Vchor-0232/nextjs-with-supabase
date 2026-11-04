-- Numbers copied from Roblox for each game (visits, likes, players...).
-- Filled in by the daily sync at /api/cron/sync-roblox; nobody edits it by hand.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table public.roblox_stats (
  game_id uuid primary key references public.games (id) on delete cascade,
  place_id bigint,                -- the number in the game's roblox.com/games/... link
  universe_id bigint,             -- Roblox's ID for the whole experience
  name text,                      -- the game's name on Roblox
  creator_name text,              -- user or group that made it
  visits bigint,
  playing integer,                -- players online when last synced
  favorites bigint,
  up_votes bigint,                -- likes
  down_votes bigint,              -- dislikes
  icon_url text,
  screenshot_urls text[] not null default '{}',
  roblox_updated_at timestamptz,  -- when the developer last updated the game
  synced_at timestamptz not null default now(),
  sync_error text                 -- why the last sync failed, if it did
);

alter table public.roblox_stats enable row level security;

-- Anyone who can see a game can see its Roblox numbers.
create policy "Roblox stats follow game visibility" on public.roblox_stats
  for select using (
    exists (select 1 from public.games g where g.id = game_id)
  );

-- Only the sync (using the secret key, which skips these rules) writes here.
revoke insert, update, delete on public.roblox_stats from anon, authenticated;
