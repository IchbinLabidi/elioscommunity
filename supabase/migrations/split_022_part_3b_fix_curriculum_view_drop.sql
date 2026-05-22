drop view if exists public.course_curriculum_public cascade;

create view public.course_curriculum_public
with (security_invoker = false) as
select
  c.subject_id,
  ch.course_id,
  ch.teacher_id,
  ch.id as chapter_id,
  ch.title as chapter_title,
  ch.description as chapter_description,
  ch.chapter_order,
  ch.is_free_preview,
  coalesce(c.price, 0) <= 0
    or ch.is_free_preview = true
    or public.has_course_access(c.id) as is_accessible
from public.course_chapters ch
join public.courses c on c.id = ch.course_id
join public.subjects s on s.id = c.subject_id
join public.profiles p on p.id = c.teacher_id
where ch.is_published = true
  and c.is_published = true
  and s.is_published = true
  and coalesce(ch.is_hidden, false) = false
  and coalesce(c.is_hidden, false) = false
  and p.role::text = 'teacher'
  and coalesce(p.is_blocked, false) = false;

grant select on public.course_curriculum_public to anon, authenticated;
