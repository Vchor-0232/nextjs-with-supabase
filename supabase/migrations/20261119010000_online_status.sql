-- Online status ("● Online" / "Last online 2h ago").
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- It only adds things; nothing existing is changed.
--
-- While someone has Gamesprout open, the site calls touch_presence() every
-- couple of minutes. Only their FRIENDS can see it (through
-- presence_for()), and anyone can switch it off in Settings
-- (profiles.show_online).

alter table public.profiles
  add column if not exists show_online boolean not null default true;
grant update (show_online) on public.profiles to authenticated;

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

-- Nobody reads or writes this table directly except their own row; other
-- people's status only comes through presence_for() below.
drop policy if exists "See your own presence" on public.user_presence;
create policy "See your own presence" on public.user_presence
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_presence from anon, authenticated;
grant select, insert, update, delete on public.user_presence to service_role;

-- "I'm here": records now() for the signed-in person only.
create or replace function public.touch_presence()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.user_presence (user_id, last_seen_at)
  select auth.uid(), now()
  where auth.uid() is not null
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
$$;

-- When each of these people was last seen, for you and your friends only,
-- and only if they haven't hidden it.
create or replace function public.presence_for(ids uuid[])
returns table (user_id uuid, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.last_seen_at
  from public.user_presence p
  join public.profiles pr on pr.id = p.user_id
  where p.user_id = any (ids[1:200])
    and auth.uid() is not null
    and (
      p.user_id = auth.uid()
      or (
        pr.show_online
        and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = auth.uid() and f.addressee_id = p.user_id)
              or (f.addressee_id = auth.uid() and f.requester_id = p.user_id))
        )
      )
    );
$$;

revoke all on function public.touch_presence() from public, anon;
revoke all on function public.presence_for(uuid[]) from public, anon;
grant execute on function public.touch_presence() to authenticated;
grant execute on function public.presence_for(uuid[]) to authenticated;
