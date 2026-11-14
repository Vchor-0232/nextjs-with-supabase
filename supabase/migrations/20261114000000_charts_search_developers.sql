-- Charts (daily history), Search (server size) and the Developer page
-- (Roblox account links and game submissions).
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- It only adds things; nothing existing is changed or deleted.

-- 1. More Roblox details per game, filled in by the daily sync.
alter table public.roblox_stats
  add column if not exists max_players integer,         -- players per server
  add column if not exists creator_id bigint,           -- Roblox user or group ID
  add column if not exists creator_type text,           -- 'User' or 'Group'
  add column if not exists roblox_created_at timestamptz;

-- 2. One row per game per day, so Charts can rank "today", "this week" and
--    "this month" and show who moved up or down.
create table if not exists public.roblox_stats_daily (
  game_id uuid not null references public.games (id) on delete cascade,
  day date not null,
  visits bigint,
  playing integer,
  up_votes bigint,
  down_votes bigint,
  primary key (game_id, day)
);

alter table public.roblox_stats_daily enable row level security;

drop policy if exists "Daily stats follow game visibility" on public.roblox_stats_daily;
create policy "Daily stats follow game visibility" on public.roblox_stats_daily
  for select using (
    exists (select 1 from public.games g where g.id = game_id)
  );

-- Only the sync (using the secret key, which skips these rules) writes here.
revoke insert, update, delete on public.roblox_stats_daily from anon, authenticated;

-- 3. Gamesprout accounts linked to a Roblox account (through "Connect
--    Roblox account"). Written only by the server after Roblox confirms who
--    the person is, so nobody can claim someone else's Roblox account.
create table if not exists public.roblox_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  roblox_user_id bigint not null unique,
  roblox_username text not null,
  roblox_display_name text,
  avatar_url text,
  connected_at timestamptz not null default now()
);

alter table public.roblox_accounts enable row level security;

drop policy if exists "See your own Roblox link" on public.roblox_accounts;
create policy "See your own Roblox link" on public.roblox_accounts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Disconnect your Roblox account" on public.roblox_accounts;
create policy "Disconnect your Roblox account" on public.roblox_accounts
  for delete to authenticated using (user_id = (select auth.uid()));

revoke insert, update on public.roblox_accounts from anon, authenticated;

-- 4. Games developers submit from the Developer page. The game itself goes
--    in games (unpublished until approved); this keeps the private details.
--    To approve one: update games set is_published = true where id = '...';
--    and update game_submissions set status = 'approved' where game_id = '...';
create table if not exists public.game_submissions (
  game_id uuid primary key references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  roblox_universe_id bigint not null,
  contact_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now()
);

alter table public.game_submissions enable row level security;

-- Developers see their own submissions; admins (profiles.is_admin) see all.
drop policy if exists "See your own submissions" on public.game_submissions;
create policy "See your own submissions" on public.game_submissions
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

revoke insert, update, delete on public.game_submissions from anon, authenticated;

-- The server (daily sync, Roblox sign-in, submissions) writes with the
-- secret key. Supabase usually grants this already; saying it is harmless.
grant select, insert, update, delete on public.roblox_stats_daily to service_role;
grant select, insert, update, delete on public.roblox_accounts to service_role;
grant select, insert, update, delete on public.game_submissions to service_role;
