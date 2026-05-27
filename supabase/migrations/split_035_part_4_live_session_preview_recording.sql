create or replace function public.get_course_live_session_preview(target_course_id uuid)
returns table (upcoming_count bigint, next_starts_at timestamp with time zone)
language sql stable security definer set search_path = public as $$
  select count(*), min(s.starts_at)
  from public.course_live_sessions s
  join public.courses c on c.id = s.course_id
  where s.course_id = target_course_id
    and s.status = 'scheduled'
    and s.is_cancelled = false
    and s.starts_at >= now()
    and c.is_published = true
    and coalesce(c.is_hidden, false) = false
    and coalesce(c.is_deleted, false) = false;
$$;

grant execute on function public.get_course_live_session_preview(uuid) to anon, authenticated;

create or replace function public.set_live_session_recording(
  target_session_id uuid, new_recording_url text, new_replay_available boolean
) returns public.course_live_sessions
language plpgsql security definer set search_path = public as $$
declare
  saved_session public.course_live_sessions;
begin
  update public.course_live_sessions s set
    recording_url = nullif(btrim(coalesce(new_recording_url, '')), ''),
    replay_available = new_replay_available and nullif(btrim(coalesce(new_recording_url, '')), '') is not null,
    updated_by = auth.uid()
  where s.id = target_session_id and (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'teacher' and p.id = s.teacher_id
        and coalesce(p.is_blocked, false) = false
        and coalesce(p.verification_status, 'pending') not in ('blocked', 'suspended')
    )
  ) returning * into saved_session;
  if saved_session.id is null then raise exception 'Live session not found or not allowed.'; end if;
  return saved_session;
end;
$$;

grant execute on function public.set_live_session_recording(uuid, text, boolean) to authenticated;
