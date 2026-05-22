create policy "Teachers can upload their own course videos" on storage.objects for insert
with check (
  bucket_id = 'course-videos'
  and (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher'))
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  and exists (
    select 1 from public.courses c
    where c.id::text = (storage.foldername(name))[2]
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
  and exists (
    select 1 from public.course_lessons l
    where l.id::text = (storage.foldername(name))[3]
      and l.course_id::text = (storage.foldername(name))[2]
      and (l.teacher_id = auth.uid() or public.is_admin())
  )
);

create policy "Teachers can update their own course videos" on storage.objects for update
using (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can delete their own course videos" on storage.objects for delete
using (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can upload their own course pdfs" on storage.objects for insert
with check (
  bucket_id = 'course-pdfs'
  and (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher'))
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  and exists (
    select 1 from public.courses c
    where c.id::text = (storage.foldername(name))[2]
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
  and exists (
    select 1 from public.course_lessons l
    where l.id::text = (storage.foldername(name))[3]
      and l.course_id::text = (storage.foldername(name))[2]
      and (l.teacher_id = auth.uid() or public.is_admin())
  )
);

create policy "Teachers can update their own course pdfs" on storage.objects for update
using (bucket_id = 'course-pdfs' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'course-pdfs' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can delete their own course pdfs" on storage.objects for delete
using (bucket_id = 'course-pdfs' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can upload their own course covers" on storage.objects for insert
with check (
  bucket_id = 'course-covers'
  and (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher'))
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'courses' and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

create policy "Teachers can update their own course covers" on storage.objects for update
using (bucket_id = 'course-covers' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'course-covers' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can delete their own course covers" on storage.objects for delete
using (bucket_id = 'course-covers' and (owner = auth.uid() or public.is_admin()));
