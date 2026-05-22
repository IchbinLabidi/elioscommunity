create or replace function public.can_read_chapter_content(
  target_course_id uuid,
  target_module_id uuid,
  target_chapter_id uuid
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.course_chapters ch
    join public.course_modules m on m.id = ch.module_id
    join public.courses c on c.id = ch.course_id
    join public.profiles p on p.id = c.teacher_id
    where ch.id = target_chapter_id
      and ch.module_id = target_module_id
      and ch.course_id = target_course_id
      and ch.is_published = true
      and m.is_published = true
      and c.is_published = true
      and coalesce(ch.is_hidden, false) = false
      and coalesce(m.is_hidden, false) = false
      and coalesce(c.is_hidden, false) = false
      and coalesce(p.is_blocked, false) = false
      and (
        c.price <= 0
        or ch.is_free_preview = true
        or public.has_course_access(c.id)
      )
  );
$$;

create or replace view public.course_curriculum_public
with (security_invoker = false) as
select
  m.id as module_id, m.course_id, m.teacher_id, m.title as module_title,
  m.description as module_description, m.module_order, ch.id as chapter_id,
  ch.title as chapter_title, ch.description as chapter_description,
  ch.chapter_order, ch.is_free_preview,
  c.price <= 0 or ch.is_free_preview = true or public.has_course_access(c.id) as is_accessible
from public.course_modules m
join public.courses c on c.id = m.course_id
left join public.course_chapters ch
  on ch.module_id = m.id and ch.is_published = true and coalesce(ch.is_hidden, false) = false
join public.profiles p on p.id = c.teacher_id
where m.is_published = true
  and c.is_published = true
  and coalesce(m.is_hidden, false) = false
  and coalesce(c.is_hidden, false) = false
  and p.role::text = 'teacher'
  and coalesce(p.is_blocked, false) = false;

grant execute on function public.can_read_chapter_content(uuid, uuid, uuid) to anon, authenticated;
grant select on public.course_curriculum_public to anon, authenticated;
