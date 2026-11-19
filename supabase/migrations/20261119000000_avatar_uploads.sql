-- Profile picture uploads: a public "avatars" storage bucket where each
-- person can only add, replace or delete files in their own folder
-- (avatars/<their user id>/...). Pictures are public so they show on
-- profiles. Max 2 MB; PNG, JPEG, WebP or GIF.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatars: see your own files" on storage.objects;
create policy "Avatars: see your own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Avatars: upload to your own folder" on storage.objects;
create policy "Avatars: upload to your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Avatars: replace your own files" on storage.objects;
create policy "Avatars: replace your own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Avatars: delete your own files" on storage.objects;
create policy "Avatars: delete your own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
