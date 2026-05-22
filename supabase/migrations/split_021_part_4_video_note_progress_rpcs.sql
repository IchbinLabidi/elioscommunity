create or replace function public.update_video_note(
  target_note_id uuid,
  note_content text,
  timestamp_seconds integer default null
) returns public.video_notes
language plpgsql security definer set search_path = public as $$
declare
  note_row public.video_notes;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(btrim(coalesce(note_content, ''))) not between 1 and 2000 then
    raise exception 'Note must be between 1 and 2000 characters.';
  end if;
  update public.video_notes
  set content = btrim(note_content), timestamp_seconds = update_video_note.timestamp_seconds
  where id = target_note_id and student_id = auth.uid()
  returning * into note_row;
  if note_row.id is null then raise exception 'Note not found or cannot be updated.'; end if;
  return note_row;
end;
$$;

create or replace function public.delete_video_note(target_note_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.video_notes where id = target_note_id and student_id = auth.uid();
  if not found then raise exception 'Note not found or cannot be deleted.'; end if;
  return true;
end;
$$;

create or replace function public.update_video_progress(
  target_video_id uuid,
  watched_seconds integer,
  completed boolean default false
) returns public.video_progress
language plpgsql security definer set search_path = public as $$
declare
  video_row public.chapter_videos;
  progress_row public.video_progress;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false) then
    raise exception 'Only students can save progress.';
  end if;
  select * into video_row from public.chapter_videos where id = target_video_id;
  if video_row.id is null or not public.can_access_course_video(target_video_id) then raise exception 'You cannot save progress for this video.'; end if;
  insert into public.video_progress(video_id, course_id, student_id, watched_seconds, completed, last_watched_at)
  values (video_row.id, video_row.course_id, auth.uid(), greatest(watched_seconds, 0), completed, now())
  on conflict (video_id, student_id) do update
  set watched_seconds = greatest(excluded.watched_seconds, public.video_progress.watched_seconds),
      completed = excluded.completed,
      last_watched_at = now()
  returning * into progress_row;
  return progress_row;
end;
$$;

grant execute on function public.update_video_note(uuid, text, integer) to authenticated;
grant execute on function public.delete_video_note(uuid) to authenticated;
grant execute on function public.update_video_progress(uuid, integer, boolean) to authenticated;
