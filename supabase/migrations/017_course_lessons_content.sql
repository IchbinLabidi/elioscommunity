alter table public.courses
  alter column format set default 'recorded';

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  lesson_order integer not null default 1,
  video_url text,
  video_path text,
  pdf_url text,
  pdf_path text,
  is_free_preview boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_lessons
  add column if not exists description text,
  add column if not exists video_url text,
  add column if not exists video_path text,
  add column if not exists pdf_url text,
  add column if not exists pdf_path text,
  add column if not exists is_free_preview boolean not null default false,
  add column if not exists is_published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.course_lessons drop constraint if exists course_lessons_order_check;
alter table public.course_lessons add constraint course_lessons_order_check check (lesson_order >= 1);

create index if not exists course_lessons_course_id_idx on public.course_lessons(course_id);
create index if not exists course_lessons_teacher_id_idx on public.course_lessons(teacher_id);
create index if not exists course_lessons_lesson_order_idx on public.course_lessons(lesson_order);
create index if not exists course_lessons_is_published_idx on public.course_lessons(is_published);

drop trigger if exists course_lessons_touch_updated_at on public.course_lessons;
create trigger course_lessons_touch_updated_at
  before update on public.course_lessons
  for each row execute procedure public.touch_updated_at();

alter table public.course_lessons enable row level security;

drop policy if exists "Public can read accessible course lessons" on public.course_lessons;
drop policy if exists "Teachers can read their own course lessons" on public.course_lessons;
drop policy if exists "Teachers can create their own course lessons" on public.course_lessons;
drop policy if exists "Teachers can update their own course lessons" on public.course_lessons;
drop policy if exists "Teachers can delete their own course lessons" on public.course_lessons;
drop policy if exists "Admins can manage course lessons" on public.course_lessons;

create policy "Public can read accessible course lessons"
  on public.course_lessons for select
  to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.courses c
      where c.id = course_id
        and c.is_published = true
        and (c.price <= 0 or course_lessons.is_free_preview = true)
    )
  );

create policy "Teachers can read their own course lessons"
  on public.course_lessons for select
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

create policy "Teachers can create their own course lessons"
  on public.course_lessons for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
  );

create policy "Teachers can update their own course lessons"
  on public.course_lessons for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      teacher_id = auth.uid()
      and exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
    )
  );

create policy "Teachers can delete their own course lessons"
  on public.course_lessons for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

create policy "Admins can manage course lessons"
  on public.course_lessons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.course_lessons to anon, authenticated;
grant insert, update, delete on public.course_lessons to authenticated;

create or replace view public.course_lesson_public_outline
with (security_invoker = false) as
select
  l.id,
  l.course_id,
  l.teacher_id,
  l.title,
  l.description,
  l.lesson_order,
  case when c.price <= 0 or l.is_free_preview = true then l.video_url else null end as video_url,
  case when c.price <= 0 or l.is_free_preview = true then l.video_path else null end as video_path,
  case when c.price <= 0 or l.is_free_preview = true then l.pdf_url else null end as pdf_url,
  case when c.price <= 0 or l.is_free_preview = true then l.pdf_path else null end as pdf_path,
  l.is_free_preview,
  l.is_published,
  l.created_at,
  l.updated_at
from public.course_lessons l
join public.courses c on c.id = l.course_id
join public.profiles p on p.id = c.teacher_id
where l.is_published = true
  and c.is_published = true
  and p.role::text = 'teacher'
  and coalesce(p.is_blocked, false) = false;

grant select on public.course_lesson_public_outline to anon, authenticated;

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
using (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin())) with check (bucket_id = 'course-videos' and (owner = auth.uid() or public.is_admin()));
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
using (bucket_id = 'course-pdfs' and (owner = auth.uid() or public.is_admin())) with check (bucket_id = 'course-pdfs' and (owner = auth.uid() or public.is_admin()));
create policy "Teachers can delete their own course pdfs" on storage.objects for delete
using (bucket_id = 'course-pdfs' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can upload their own course covers" on storage.objects for insert
with check (
  bucket_id = 'course-covers'
  and (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher'))
  and (
    public.is_admin()
    or
    (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'courses' and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

create policy "Teachers can update their own course covers" on storage.objects for update
using (bucket_id = 'course-covers' and (owner = auth.uid() or public.is_admin())) with check (bucket_id = 'course-covers' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers can delete their own course covers" on storage.objects for delete
using (bucket_id = 'course-covers' and (owner = auth.uid() or public.is_admin()));
