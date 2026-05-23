create or replace function public.protect_course_content_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_admin() and (
    new.is_hidden is distinct from old.is_hidden
    or new.hidden_reason is distinct from old.hidden_reason
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.moderated_by is distinct from old.moderated_by
    or new.moderated_at is distinct from old.moderated_at
  ) then raise exception 'Only admins can change course content moderation fields'; end if;
  return new;
end;
$$;

drop trigger if exists course_chapters_protect_admin_fields on public.course_chapters;
create trigger course_chapters_protect_admin_fields before update on public.course_chapters
for each row execute function public.protect_course_content_admin_fields();

drop trigger if exists chapter_videos_protect_admin_fields on public.chapter_videos;
create trigger chapter_videos_protect_admin_fields before update on public.chapter_videos
for each row execute function public.protect_course_content_admin_fields();

drop trigger if exists chapter_attachments_protect_admin_fields on public.chapter_attachments;
create trigger chapter_attachments_protect_admin_fields before update on public.chapter_attachments
for each row execute function public.protect_course_content_admin_fields();
