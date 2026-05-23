create or replace function public.can_access_course_video(target_video_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chapter_videos v
    join public.course_chapters ch on ch.id = v.chapter_id
    join public.courses c on c.id = v.course_id
    join public.subjects s on s.id = c.subject_id
    join public.profiles teacher on teacher.id = c.teacher_id
    where v.id = target_video_id
      and coalesce(v.is_hidden, false) = false
      and coalesce(ch.is_hidden, false) = false
      and coalesce(c.is_hidden, false) = false
      and coalesce(c.is_deleted, false) = false
      and coalesce(teacher.is_blocked, false) = false
      and (
        public.is_admin() or c.teacher_id = auth.uid()
        or (
          v.is_published = true and ch.is_published = true and c.is_published = true
          and s.is_published = true
          and (coalesce(c.price, 0) <= 0 or ch.is_free_preview = true or public.has_course_access(c.id))
        )
      )
  );
$$;

create or replace function public.protect_course_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_admin() and (
    new.is_hidden is distinct from old.is_hidden
    or new.hidden_reason is distinct from old.hidden_reason
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.moderated_by is distinct from old.moderated_by
    or new.moderated_at is distinct from old.moderated_at
    or new.is_featured is distinct from old.is_featured
    or new.featured_at is distinct from old.featured_at
    or new.featured_by is distinct from old.featured_by
    or new.admin_review_status is distinct from old.admin_review_status
    or new.admin_review_note is distinct from old.admin_review_note
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.is_deleted is distinct from old.is_deleted
    or new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by
    or new.deleted_reason is distinct from old.deleted_reason
  ) then raise exception 'Only admins can change course review fields'; end if;
  return new;
end;
$$;

drop trigger if exists courses_protect_admin_fields on public.courses;
create trigger courses_protect_admin_fields before update on public.courses
for each row execute function public.protect_course_admin_fields();

grant execute on function public.can_access_course_video(uuid) to authenticated, anon;
