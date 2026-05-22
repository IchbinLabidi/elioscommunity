create or replace function public.update_video_comment(target_comment_id uuid, comment_content text)
returns public.video_comments
language plpgsql security definer set search_path = public as $$
declare
  comment_row public.video_comments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(btrim(coalesce(comment_content, ''))) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;
  update public.video_comments
  set content = btrim(comment_content)
  where id = target_comment_id
    and coalesce(is_hidden, false) = false
    and (user_id = auth.uid() or public.is_admin())
  returning * into comment_row;
  if comment_row.id is null then raise exception 'Comment not found or cannot be updated.'; end if;
  return comment_row;
end;
$$;

create or replace function public.delete_video_comment(target_comment_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.video_comments
  where id = target_comment_id and (user_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Comment not found or cannot be deleted.'; end if;
  return true;
end;
$$;

create or replace function public.create_video_note(
  target_video_id uuid,
  note_content text,
  timestamp_seconds integer default null
) returns public.video_notes
language plpgsql security definer set search_path = public as $$
declare
  video_row public.chapter_videos;
  note_row public.video_notes;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false) then
    raise exception 'Only students can create private notes.';
  end if;
  if length(btrim(coalesce(note_content, ''))) not between 1 and 2000 then
    raise exception 'Note must be between 1 and 2000 characters.';
  end if;
  select * into video_row from public.chapter_videos where id = target_video_id;
  if video_row.id is null or not public.can_access_course_video(target_video_id) then raise exception 'You cannot add notes to this video.'; end if;
  insert into public.video_notes(video_id, course_id, chapter_id, student_id, content, timestamp_seconds)
  values (video_row.id, video_row.course_id, video_row.chapter_id, auth.uid(), btrim(note_content), timestamp_seconds)
  returning * into note_row;
  return note_row;
end;
$$;

grant execute on function public.update_video_comment(uuid, text) to authenticated;
grant execute on function public.delete_video_comment(uuid) to authenticated;
grant execute on function public.create_video_note(uuid, text, integer) to authenticated;
