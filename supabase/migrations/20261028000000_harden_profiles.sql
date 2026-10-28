-- ALREADY RUN in Supabase on 2026-10-28. Recorded here so the schema lives in the repo.
-- The profiles table and the on_auth_user_created trigger existed before this.

alter table public.profiles
  add column roblox_username text
  check (roblox_username ~ '^[A-Za-z0-9_]{3,20}$');

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]+$');

create unique index profiles_username_lower_key
  on public.profiles (lower(username));

-- Users can edit their own profile, but not is_admin or is_developer.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio, roblox_username)
  on public.profiles to authenticated;
