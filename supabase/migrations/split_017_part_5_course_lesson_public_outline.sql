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
