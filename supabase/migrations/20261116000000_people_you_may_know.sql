-- "People you may know" on the Friends page.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- It only adds one function; nothing existing is changed.
--
-- Suggests people for whoever is signed in, best first:
--   friends of your friends (more mutual friends rank higher),
--   people who favorited the same games as you,
--   people who follow you,
--   then the newest members.
-- Skips you, your friends and anyone you have a pending request with.
--
-- Friendships are private (you can only read your own), so this runs with
-- the owner's rights. It only ever returns the signed-in person's own
-- suggestions and a count of mutual friends, never anyone's friend list.

create or replace function public.people_you_may_know(max_results integer default 12)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  mutual_friends integer,
  shared_games integer,
  follows_you boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  ),
  -- Everyone you're already connected to: friends and pending requests.
  my_links as (
    select case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as other,
           f.status
    from public.friendships f, me
    where me.uid in (f.requester_id, f.addressee_id)
  ),
  my_friends as (
    select other from my_links where status = 'accepted'
  ),
  friends_of_friends as (
    select case when f.requester_id = mf.other then f.addressee_id else f.requester_id end as person,
           count(*) as mutual
    from public.friendships f
    join my_friends mf on mf.other in (f.requester_id, f.addressee_id)
    where f.status = 'accepted'
    group by 1
  ),
  shared as (
    select theirs.user_id as person, count(*) as games
    from public.favorite_games mine
    join public.favorite_games theirs on theirs.game_id = mine.game_id
    cross join me
    where mine.user_id = me.uid and theirs.user_id <> me.uid
    group by 1
  ),
  followers as (
    select follower_id as person
    from public.follows, me
    where following_id = me.uid
  )
  select p.id,
         p.username,
         p.display_name,
         p.avatar_url,
         coalesce(fof.mutual, 0)::integer,
         coalesce(s.games, 0)::integer,
         (fl.person is not null)
  from public.profiles p
  cross join me
  left join friends_of_friends fof on fof.person = p.id
  left join shared s on s.person = p.id
  left join followers fl on fl.person = p.id
  where me.uid is not null
    and p.id <> me.uid
    and not exists (select 1 from my_links l where l.other = p.id)
  order by coalesce(fof.mutual, 0) * 3
             + coalesce(s.games, 0) * 2
             + case when fl.person is not null then 2 else 0 end desc,
           p.created_at desc
  limit least(greatest(coalesce(max_results, 12), 1), 50);
$$;

-- Only signed-in people can ask for suggestions.
revoke all on function public.people_you_may_know(integer) from public, anon;
grant execute on function public.people_you_may_know(integer) to authenticated;
