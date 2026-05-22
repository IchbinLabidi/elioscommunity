create or replace function public.can_read_chapter_content(
  target_course_id uuid,
  target_module_id uuid,
  target_chapter_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_chapters ch
    join public.course_modules m on m.id = ch.module_id
    join public.courses c on c.id = ch.course_id
    where ch.id = target_chapter_id
      and ch.module_id = target_module_id
      and ch.course_id = target_course_id
      and ch.is_published = true
      and m.is_published = true
      and c.is_published = true
      and (c.price <= 0 or ch.is_free_preview = true)
  );
$$;

create or replace function public.can_manage_chapter_content(
  target_teacher_id uuid,
  target_course_id uuid,
  target_module_id uuid,
  target_chapter_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or (
      auth.uid() = target_teacher_id
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher')
      and exists (
        select 1 from public.course_chapters ch
        where ch.id = target_chapter_id
          and ch.module_id = target_module_id
          and ch.course_id = target_course_id
          and ch.teacher_id = auth.uid()
      )
    );
$$;

grant execute on function public.can_read_chapter_content(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.can_manage_chapter_content(uuid, uuid, uuid, uuid) to authenticated;

alter table public.chapter_videos enable row level security;
alter table public.chapter_attachments enable row level security;

drop policy if exists "Public can read accessible chapter videos" on public.chapter_videos;
drop policy if exists "Teachers can manage own chapter videos" on public.chapter_videos;
drop policy if exists "Admins can manage chapter videos" on public.chapter_videos;
drop policy if exists "Public can read accessible chapter attachments" on public.chapter_attachments;
drop policy if exists "Teachers can manage own chapter attachments" on public.chapter_attachments;
drop policy if exists "Admins can manage chapter attachments" on public.chapter_attachments;

create policy "Public can read accessible chapter videos" on public.chapter_videos for select
to anon, authenticated
using (
  public.can_read_chapter_content(course_id, module_id, chapter_id)
  or public.can_manage_chapter_content(teacher_id, course_id, module_id, chapter_id)
);

create policy "Teachers can manage own chapter videos" on public.chapter_videos for all
to authenticated
using (public.can_manage_chapter_content(teacher_id, course_id, module_id, chapter_id))
with check (public.can_manage_chapter_content(teacher_id, course_id, module_id, chapter_id));

create policy "Public can read accessible chapter attachments" on public.chapter_attachments for select
to anon, authenticated
using (
  public.can_read_chapter_content(course_id, module_id, chapter_id)
  or public.can_manage_chapter_content(teacher_id, course_id, module_id, chapter_id)
);

create policy "Teachers can manage own chapter attachments" on public.chapter_attachments for all
to authenticated
using (public.can_manage_chapter_content(teacher_id, course_id, module_id, chapter_id))
with check (public.can_manage_chapter_content(teacher_id, course_id, module_id, chapter_id));

grant select on public.chapter_videos, public.chapter_attachments to anon, authenticated;
grant insert, update, delete on public.chapter_videos, public.chapter_attachments to authenticated;
