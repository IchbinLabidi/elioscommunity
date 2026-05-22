create or replace function public.can_access_course_video(target_video_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.chapter_videos v
    join public.course_chapters ch on ch.id = v.chapter_id
    join public.course_modules m on m.id = v.module_id
    join public.courses c on c.id = v.course_id
    join public.profiles teacher on teacher.id = c.teacher_id
    where v.id = target_video_id
      and coalesce(v.is_hidden, false) = false
      and coalesce(ch.is_hidden, false) = false
      and coalesce(m.is_hidden, false) = false
      and coalesce(c.is_hidden, false) = false
      and coalesce(teacher.is_blocked, false) = false
      and (
        public.is_admin()
        or c.teacher_id = auth.uid()
        or (
          v.is_published = true and ch.is_published = true
          and m.is_published = true and c.is_published = true
          and (coalesce(c.price, 0) <= 0 or ch.is_free_preview = true or public.has_course_access(c.id))
        )
      )
  );
$$;

create or replace function public.list_video_comments(target_video_id uuid)
returns table (
  id uuid, video_id uuid, course_id uuid, chapter_id uuid, user_id uuid,
  parent_comment_id uuid, content text, timestamp_seconds integer,
  is_hidden boolean, hidden_reason text, created_at timestamp with time zone,
  updated_at timestamp with time zone, full_name text, avatar_url text, role text
) language sql stable security definer set search_path = public as $$
  select vc.id, vc.video_id, vc.course_id, vc.chapter_id, vc.user_id,
    vc.parent_comment_id, vc.content, vc.timestamp_seconds,
    vc.is_hidden, vc.hidden_reason, vc.created_at, vc.updated_at,
    p.full_name, p.avatar_url, p.role::text
  from public.video_comments vc
  join public.profiles p on p.id = vc.user_id
  where vc.video_id = target_video_id
    and (coalesce(vc.is_hidden, false) = false or public.is_admin())
    and (public.can_access_course_video(target_video_id) or public.is_admin())
  order by vc.created_at asc;
$$;

create or replace function public.create_video_comment(
  target_video_id uuid,
  comment_content text,
  timestamp_seconds integer default null,
  parent_comment_id uuid default null
) returns public.video_comments
language plpgsql security definer set search_path = public as $$
declare
  video_row public.chapter_videos;
  profile_row public.profiles;
  inserted public.video_comments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(btrim(coalesce(comment_content, ''))) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;
  select * into video_row from public.chapter_videos where id = target_video_id;
  if video_row.id is null then raise exception 'Video not found.'; end if;
  select * into profile_row from public.profiles where id = auth.uid();
  if profile_row.id is null or coalesce(profile_row.is_blocked, false) then raise exception 'Account cannot comment.'; end if;
  if parent_comment_id is not null and not exists (
    select 1 from public.video_comments vc where vc.id = parent_comment_id and vc.video_id = target_video_id and vc.parent_comment_id is null
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

grant execute on function public.can_access_course_video(uuid) to authenticated, anon;
grant execute on function public.list_video_comments(uuid) to authenticated, anon;
grant execute on function public.create_video_comment(uuid, text, integer, uuid) to authenticated;
