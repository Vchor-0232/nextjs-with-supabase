-- One-on-one chat between friends.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,               -- when the recipient opened the chat
  check (sender_id <> recipient_id)
);

-- Fast lookups for one chat (either direction) and for unread counts.
create index direct_messages_pair_idx on public.direct_messages
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index direct_messages_unread_idx on public.direct_messages (recipient_id)
  where read_at is null;

alter table public.direct_messages enable row level security;

-- Only the two people in a chat can read it.
create policy "Read your own chats" on public.direct_messages
  for select to authenticated using (
    (select auth.uid()) in (sender_id, recipient_id)
  );

-- You can only message people who are your friends (accepted request).
create policy "Message your friends" on public.direct_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id)
        )
    )
  );

-- The recipient marks messages as read; nothing else can change.
create policy "Mark messages read" on public.direct_messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

revoke update, delete on public.direct_messages from anon, authenticated;
grant update (read_at) on public.direct_messages to authenticated;

-- Send new messages to open chats instantly (Supabase Realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
