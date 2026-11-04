-- Lets the daily job import Roblox's top games into Gamesprout.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- Where each game came from: added on Gamesprout, or imported from Roblox.
alter table public.games
  add column if not exists source text not null default 'gamesprout';

alter table public.games
  add constraint games_source_check
  check (source in ('gamesprout', 'roblox_import'));

-- The game's description on Roblox, shown when there's no Gamesprout one.
alter table public.roblox_stats
  add column if not exists description text;
