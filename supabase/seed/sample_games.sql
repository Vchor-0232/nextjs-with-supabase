-- OPTIONAL sample games so the Home page has something to show while you build.
-- They're owned by the oldest profile and have made-up names and visit counts.
-- Run in the SQL Editor after 20261103000000_games_and_friends.sql.
--
-- To remove them later:
--   delete from public.games where description = 'Sample game';

with owner as (
  select id from public.profiles order by created_at limit 1
),
new_games as (
  insert into public.games (user_id, title, description, roblox_url, visits)
  select owner.id, g.title, 'Sample game', g.url, g.visits
  from owner,
  (values
    ('Sprout Valley Tycoon', 'https://www.roblox.com/games/0/sample-1', 3100000),
    ('Midnight Lantern',     'https://www.roblox.com/games/0/sample-2', 1800000),
    ('Island of Echoes',     'https://www.roblox.com/games/0/sample-3', 30400000),
    ('Neon Rooftop Obby',    'https://www.roblox.com/games/0/sample-4', 640000),
    ('Starship Siege',       'https://www.roblox.com/games/0/sample-5', 250000)
  ) as g(title, url, visits)
  returning id, title
)
insert into public.game_tags (game_id, tag_id, position)
select ng.id, t.id, gt.position
from new_games ng
join (values
  ('Sprout Valley Tycoon', 'Tycoon',    0),
  ('Sprout Valley Tycoon', 'Co-op',     1),
  ('Midnight Lantern',     'Survival',  0),
  ('Midnight Lantern',     'Horror',    1),
  ('Island of Echoes',     'Adventure', 0),
  ('Island of Echoes',     'Survival',  1),
  ('Neon Rooftop Obby',    'Obby',      0),
  ('Starship Siege',       'Shooter',   0),
  ('Starship Siege',       'Co-op',     1)
) as gt(title, tag, position) on gt.title = ng.title
join public.tags t on t.name = gt.tag;
