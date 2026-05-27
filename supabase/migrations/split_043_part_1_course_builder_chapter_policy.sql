-- Modern course builders attach chapters directly to a course, without a legacy module.
drop policy if exists "Teachers can manage own course chapters" on public.course_chapters;

create policy "Teachers can manage own course chapters"
on public.course_chapters for all
to authenticated
using (public.can_manage_course_content(teacher_id, course_id))
with check (public.can_manage_course_content(teacher_id, course_id));

grant select, insert, update, delete on public.course_chapters to authenticated;
