create or replace function public.can_access_course_video(target_video_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.chapter_videos v
    join public.course_chapters ch on ch.id = v.chapter_id
    join public.courses c on c.id = v.course_id
    join public.subjects s on s.id = c.subject_id
    join public.profiles teacher on teacher.id = c.teacher_id
    where v.id = target_video_id
      and coalesce(v.is_hidden, false) = false
      and coalesce(ch.is_hidden, false) = false
      and coalesce(c.is_hidden, false) = false
      and coalesce(teacher.is_blocked, false) = false
      and (
        public.is_admin()
        or c.teacher_id = auth.uid()
        or (
          v.is_published = true
          and ch.is_published = true
          and c.is_published = true
          and s.is_published = true
          and (coalesce(c.price, 0) <= 0 or ch.is_free_preview = true or public.has_course_access(c.id))
        )
      )
  );
$$;

grant execute on function public.can_access_course_video(uuid) to authenticated, anon;
