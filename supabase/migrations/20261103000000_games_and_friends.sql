-- Tables behind the Home page: games, genre tags, thumbs-up ratings and friends.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- If you get "already exists", stop and check what that table holds first.

-- Games developers post ----------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 2000),
  roblox_url text not null
    check (roblox_url ~ '^https://(www\.)?roblox\.com/games/'),
  thumbnail_url text,
  visits bigint not null default 0 check (visits >= 0),
  created_at timestamptz not null default now()
);

create index games_user_id_idx on public.games (user_id);
create index games_visits_idx on public.games (visits desc);

alter table public.games enable row level security;

create policy "Games are public" on public.games
  for select using (true);
create policy "Developers add own games" on public.games
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Developers update own games" on public.games
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Developers delete own games" on public.games
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Developers can't set their own visit count (Popular Now ranks by it) or
-- move a game to someone else. user_id fills in from auth.uid().
revoke insert, update on public.games from anon, authenticated;
grant insert (title, description, roblox_url, thumbnail_url)
  on public.games to authenticated;
grant update (title, description, roblox_url, thumbnail_url)
  on public.games to authenticated;

-- Genre tags (RPG, Co-op, Survival...) --------------------------------------
-- Only you add tags (here in the SQL Editor), so the list stays tidy.
create table public.tags (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 30)
);

alter table public.tags enable row level security;

create policy "Tags are public" on public.tags
  for select using (true);

insert into public.tags (name) values
  ('RPG'), ('Co-op'), ('Survival'), ('Horror'), ('Obby'),
  ('Simulator'), ('Tycoon'), ('Adventure'), ('Shooter'), ('Puzzle');

-- Which tags each game has. "position" 0 is the main genre (shown in blue).
create table public.game_tags (
  game_id uuid not null references public.games (id) on delete cascade,
  tag_id bigint not null references public.tags (id) on delete cascade,
  position smallint not null default 0,
  primary key (game_id, tag_id)
);

alter table public.game_tags enable row level security;

create policy "Game tags are public" on public.game_tags
  for select using (true);
create policy "Developers tag own games" on public.game_tags
  for insert to authenticated with check (
    exists (select 1 from public.games g
            where g.id = game_id and g.user_id = (select auth.uid()))
  );
create policy "Developers untag own games" on public.game_tags
  for delete to authenticated using (
    exists (select 1 from public.games g
            where g.id = game_id and g.user_id = (select auth.uid()))
  );

-- Thumbs up / thumbs down, one per user per game ----------------------------
create table public.game_ratings (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  is_like boolean not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.game_ratings enable row level security;

create policy "Ratings are public" on public.game_ratings
  for select using (true);
create policy "Users rate as themselves" on public.game_ratings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change own rating" on public.game_ratings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users remove own rating" on public.game_ratings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Each game with its % rating, e.g. 72% of votes are thumbs up.
create view public.game_stats with (security_invoker = true) as
select
  g.id,
  g.title,
  g.thumbnail_url,
  g.roblox_url,
  g.visits,
  g.created_at,
  count(r.game_id) as votes,
  (case when count(r.game_id) = 0 then null
        else round(100.0 * count(*) filter (where r.is_like) / count(r.game_id))
   end)::int as rating_pct
from public.games g
left join public.game_ratings r on r.game_id = g.id
group by g.id;

-- Friends ---------------------------------------------------------------------
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
