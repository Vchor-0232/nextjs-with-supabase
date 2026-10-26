-- Posts written by logged-in users.
-- Recorded here so the schema lives in the repo alongside the code that uses it.

create table posts (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users,
  content text not null
);

alter table posts enable row level security;

create policy "Users insert own posts" on posts
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users read own posts" on posts
  for select to authenticated using (auth.uid() = user_id);
