insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-covers', 'course-covers', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('course-videos', 'course-videos', false, 314572800, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('course-pdfs', 'course-pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view course videos" on storage.objects;
drop policy if exists "Teachers can upload their own course videos" on storage.objects;
drop policy if exists "Teachers can update their own course videos" on storage.objects;
drop policy if exists "Teachers can delete their own course videos" on storage.objects;
drop policy if exists "Public can view course pdfs" on storage.objects;
drop policy if exists "Teachers can upload their own course pdfs" on storage.objects;
drop policy if exists "Teachers can update their own course pdfs" on storage.objects;
drop policy if exists "Teachers can delete their own course pdfs" on storage.objects;
drop policy if exists "Teachers can upload their own course covers" on storage.objects;
drop policy if exists "Teachers can update their own course covers" on storage.objects;
drop policy if exists "Teachers can delete their own course covers" on storage.objects;

create policy "Public can view course videos" on storage.objects for select
using (
  bucket_id = 'course-videos'
  and exists (
    select 1
    from public.course_lessons l
    join public.courses c on c.id = l.course_id
    where l.id::text = (storage.foldername(name))[3]
      and c.id::text = (storage.foldername(name))[2]
      and (
        public.is_admin()
        or l.teacher_id = auth.uid()
        or (
          l.is_published = true
          and c.is_published = true
          and (c.price <= 0 or l.is_free_preview = true)
        )
      )
  )
);

create policy "Public can view course pdfs" on storage.objects for select
using (
  bucket_id = 'course-pdfs'
  and exists (
    select 1
    from public.course_lessons l
    join public.courses c on c.id = l.course_id
    where l.id::text = (storage.foldername(name))[3]
      and c.id::text = (storage.foldername(name))[2]
      and (
        public.is_admin()
        or l.teacher_id = auth.uid()
        or (
          l.is_published = true
          and c.is_published = true
          and (c.price <= 0 or l.is_free_preview = true)
        )
      )
  )
);
