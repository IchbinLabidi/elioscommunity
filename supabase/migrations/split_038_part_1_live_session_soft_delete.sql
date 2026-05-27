alter table public.course_live_sessions
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists delete_reason text;

alter table public.course_live_sessions
  drop constraint if exists course_live_sessions_status_check;

alter table public.course_live_sessions
  add constraint course_live_sessions_status_check
  check (status in ('scheduled', 'live', 'completed', 'cancelled', 'deleted'));

create index if not exists course_live_sessions_deleted_at_idx
  on public.course_live_sessions(deleted_at);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'question_answered', 'answer_replied', 'best_answer_selected',
  'teacher_followed', 'teacher_new_course', 'course_enrollment_submitted',
  'course_enrollment_approved', 'course_enrollment_rejected', 'video_comment',
  'rating_received', 'report_resolved', 'admin_message', 'live_session_scheduled',
  'live_session_updated', 'live_session_cancelled', 'live_session_deleted',
  'live_session_recording_available', 'live_session_reminder'
));

drop policy if exists "Course owners and approved students can read live sessions" on public.course_live_sessions;
create policy "Course owners and approved students can read live sessions"
on public.course_live_sessions for select to authenticated using (
  public.is_admin()
  or teacher_id = auth.uid()
  or (
    deleted_at is null
    and status <> 'deleted'
    and exists (
      select 1 from public.course_enrollments e
      where e.course_id = course_live_sessions.course_id
        and e.student_id = auth.uid()
        and e.status = 'approved'
    )
  )
);

create or replace function public.get_course_live_session_preview(target_course_id uuid)
returns table (upcoming_count bigint, next_starts_at timestamp with time zone)
language sql stable security definer set search_path = public as $$
  select count(*), min(s.starts_at)
  from public.course_live_sessions s
  join public.courses c on c.id = s.course_id
  where s.course_id = target_course_id
    and s.status = 'scheduled'
    and s.deleted_at is null
    and s.is_cancelled = false
    and s.starts_at >= now()
    and c.is_published = true
    and coalesce(c.is_hidden, false) = false
    and coalesce(c.is_deleted, false) = false;
$$;

grant execute on function public.get_course_live_session_preview(uuid) to anon, authenticated;

comment on column public.course_live_sessions.deleted_at is
  'Soft deletion timestamp; deleted live sessions are excluded from normal lists.';

comment on column public.course_live_sessions.delete_reason is
  'Optional reason supplied when an authorized teacher or administrator deletes the live session.';
