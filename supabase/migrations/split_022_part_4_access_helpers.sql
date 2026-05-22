create or replace function public.can_read_chapter_content(
  target_course_id uuid,
  target_module_id uuid,
  target_chapter_id uuid
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    join public.subjects s on s.id = c.subject_id
    join public.profiles p on p.id = c.teacher_id
    where ch.id = target_chapter_id
      and ch.course_id = target_course_id
      and ch.is_published = true
      and c.is_published = true
      and s.is_published = true
      and coalesce(ch.is_hidden, false) = false
      and coalesce(c.is_hidden, false) = false
      and coalesce(p.is_blocked, false) = false
      and (coalesce(c.price, 0) <= 0 or ch.is_free_preview = true or public.has_course_access(c.id))
  );
$$;

create or replace function public.can_manage_chapter_content(
  target_teacher_id uuid,
  target_course_id uuid,
  target_module_id uuid,
  target_chapter_id uuid
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or (
      auth.uid() = target_teacher_id
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false
      )
      and exists (
        select 1 from public.course_chapters ch
        where ch.id = target_chapter_id
          and ch.course_id = target_course_id
          and ch.teacher_id = auth.uid()
      )
    );
$$;

grant execute on function public.can_read_chapter_content(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.can_manage_chapter_content(uuid, uuid, uuid, uuid) to authenticated;
