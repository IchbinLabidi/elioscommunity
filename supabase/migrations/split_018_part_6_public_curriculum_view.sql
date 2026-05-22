create or replace view public.course_curriculum_public
with (security_invoker = false) as
select
  m.id as module_id,
  m.course_id,
  m.teacher_id,
  m.title as module_title,
  m.description as module_description,
  m.module_order,
  ch.id as chapter_id,
  ch.title as chapter_title,
  ch.description as chapter_description,
  ch.chapter_order,
  ch.is_free_preview,
  c.price <= 0 or ch.is_free_preview = true as is_accessible
from public.course_modules m
join public.courses c on c.id = m.course_id
left join public.course_chapters ch on ch.module_id = m.id and ch.is_published = true
join public.profiles p on p.id = c.teacher_id
where m.is_published = true
  and c.is_published = true
  and p.role::text = 'teacher'
  and coalesce(p.is_blocked, false) = false;

grant select on public.course_curriculum_public to anon, authenticated;
