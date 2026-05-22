insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view question images" on storage.objects;
drop policy if exists "Authenticated users can upload question images" on storage.objects;
drop policy if exists "Students can upload their own question images" on storage.objects;
drop policy if exists "Students can update their own question images" on storage.objects;
drop policy if exists "Students can delete their own question images" on storage.objects;

create policy "Public can view question images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'question-images');

create policy "Students can upload their own question images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = 'questions'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Students can update their own question images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'question-images' and owner = auth.uid())
  with check (bucket_id = 'question-images' and owner = auth.uid());

create policy "Students can delete their own question images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'question-images' and owner = auth.uid());
