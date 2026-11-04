-- Replies on game reviews. A comment with a parent_id is a reply to that
-- comment; top-level comments are reviews shown with the writer's rating.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

alter table public.comments
  add column if not exists parent_id uuid
    references public.comments (id) on delete cascade;

create index if not exists comments_parent_id_idx on public.comments (parent_id);
create index if not exists comments_game_id_created_idx
  on public.comments (game_id, created_at desc);

-- Replies must be on the same game, and only one level deep
-- (you reply to a review, not to a reply).
create or replace function public.check_comment_reply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments p
    where p.id = new.parent_id
      and p.game_id = new.game_id
      and p.parent_id is null
  ) then
    raise exception 'Replies must be to a review on the same game';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_check_reply on public.comments;
create trigger comments_check_reply
  before insert or update of parent_id, game_id on public.comments
  for each row execute function public.check_comment_reply();
