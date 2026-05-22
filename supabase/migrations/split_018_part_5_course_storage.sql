insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-videos', 'course-videos', false, 314572800, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('course-attachments', 'course-attachments', false, 52428800, array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Teachers can upload chapter videos" on storage.objects;
drop policy if exists "Teachers can manage chapter videos" on storage.objects;
drop policy if exists "Teachers can upload chapter attachments" on storage.objects;
drop policy if exists "Teachers can manage chapter attachments" on storage.objects;
drop policy if exists "Public can read accessible chapter videos" on storage.objects;
drop policy if exists "Public can read accessible chapter attachments" on storage.objects;

create policy "Public can read accessible chapter videos" on storage.objects for select
using (
  bucket_id = 'course-videos'
  and exists (
    select 1 from public.course_chapters ch
    join public.course_modules m on m.id = ch.module_id
    join public.courses c on c.id = ch.course_id
    where ch.id::text = (storage.foldername(name))[4]
      and m.is_published = true and ch.is_published = true and c.is_published = true
      and (c.price <= 0 or ch.is_free_preview = true or ch.teacher_id = auth.uid() or public.is_admin())
  )
);

create policy "Public can read accessible chapter attachments" on storage.objects for select
using (
  bucket_id = 'course-attachments'
  and exists (
    select 1 from public.course_chapters ch
    join public.course_modules m on m.id = ch.module_id
    join public.courses c on c.id = ch.course_id
    where ch.id::text = (storage.foldername(name))[4]
      and m.is_published = true and ch.is_published = true and c.is_published = true
      and (c.price <= 0 or ch.is_free_preview = true or ch.teacher_id = auth.uid() or public.is_admin())
  )
);

create policy "Teachers can upload chapter videos" on storage.objects for insert
with check (
  bucket_id = 'course-videos'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  and exists (select 1 from public.course_chapters ch where ch.course_id::text = (storage.foldername(name))[2] and ch.module_id::text = (storage.foldername(name))[3] and ch.id::text = (storage.foldername(name))[4] and (ch.teacher_id = auth.uid() or public.is_admin()))
);

create policy "Teachers can manage chapter videos" on storage.objects for all
using (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can upload chapter attachments" on storage.objects for insert
with check (
  bucket_id = 'course-attachments'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  and exists (select 1 from public.course_chapters ch where ch.course_id::text = (storage.foldername(name))[2] and ch.module_id::text = (storage.foldername(name))[3] and ch.id::text = (storage.foldername(name))[4] and (ch.teacher_id = auth.uid() or public.is_admin()))
);

create policy "Teachers can manage chapter attachments" on storage.objects for all
using (bucket_id = 'course-attachments' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'course-attachments' and (owner = auth.uid() or public.is_admin()));
