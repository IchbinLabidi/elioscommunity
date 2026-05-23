create or replace function public.can_discuss_answer(target_answer_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.answers a
    join public.questions q on q.id = a.question_id
    join public.profiles p on p.id = auth.uid()
    where a.id = target_answer_id and coalesce(p.is_blocked, false) = false
      and coalesce(a.is_hidden, false) = false and coalesce(q.is_hidden, false) = false
      and (
        public.is_admin()
        or (p.role::text = 'student' and q.student_id = auth.uid())
        or (p.role::text = 'teacher' and a.teacher_id = auth.uid()
          and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
      )
  );
$$;

create or replace function public.create_video_comment(
  target_video_id uuid, comment_content text, timestamp_seconds integer default null,
  parent_comment_id uuid default null
) returns public.video_comments
language plpgsql security definer set search_path = public as $$
declare video_row public.chapter_videos; profile_row public.profiles; inserted public.video_comments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(btrim(coalesce(comment_content, ''))) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;
  select * into video_row from public.chapter_videos where id = target_video_id;
  if video_row.id is null then raise exception 'Video not found.'; end if;
  select * into profile_row from public.profiles where id = auth.uid();
  if profile_row.id is null or coalesce(profile_row.is_blocked, false)
    or (profile_row.role::text = 'teacher' and coalesce(profile_row.verification_status, 'pending') in ('suspended', 'blocked')) then
    raise exception 'Account cannot comment.';
  end if;
  if parent_comment_id is not null and not exists (
    select 1 from public.video_comments vc where vc.id = parent_comment_id
      and vc.video_id = target_video_id and vc.parent_comment_id is null
  ) then raise exception 'Parent comment not found.'; end if;
  if not (public.is_admin() or video_row.teacher_id = auth.uid() or public.can_access_course_video(target_video_id)) then
    raise exception 'You cannot comment on this video.';
  end if;
  insert into public.video_comments(video_id, course_id, chapter_id, user_id, parent_comment_id, content, timestamp_seconds)
  values (video_row.id, video_row.course_id, video_row.chapter_id, auth.uid(), parent_comment_id, btrim(comment_content), timestamp_seconds)
  returning * into inserted;
  return inserted;
end;
$$;

grant execute on function public.can_discuss_answer(uuid) to authenticated;
grant execute on function public.create_video_comment(uuid, text, integer, uuid) to authenticated;
