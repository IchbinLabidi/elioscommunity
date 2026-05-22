insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('course-covers', 'course-covers', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view avatars" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
drop policy if exists "Public can view course covers" on storage.objects;
drop policy if exists "Teachers can upload their own course covers" on storage.objects;
drop policy if exists "Teachers can update their own course covers" on storage.objects;
drop policy if exists "Teachers can delete their own course covers" on storage.objects;

create policy "Public can view avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "Public can view course covers"
  on storage.objects for select using (bucket_id = 'course-covers');

create policy "Teachers can upload their own course covers"
  on storage.objects for insert
  with check (
    bucket_id = 'course-covers'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher')
    and (storage.foldername(name))[1] = 'courses'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Teachers can update their own course covers"
  on storage.objects for update
  using (bucket_id = 'course-covers' and owner = auth.uid())
  with check (bucket_id = 'course-covers' and owner = auth.uid());

create policy "Teachers can delete their own course covers"
  on storage.objects for delete
  using (bucket_id = 'course-covers' and owner = auth.uid());
