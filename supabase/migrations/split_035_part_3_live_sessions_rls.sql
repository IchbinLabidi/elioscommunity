alter table public.course_live_sessions enable row level security;
alter table public.live_session_notifications enable row level security;

drop policy if exists "Course owners and approved students can read live sessions" on public.course_live_sessions;
create policy "Course owners and approved students can read live sessions"
on public.course_live_sessions for select to authenticated using (
  public.is_admin()
  or teacher_id = auth.uid()
  or exists (
    select 1 from public.course_enrollments e
    where e.course_id = course_live_sessions.course_id
      and e.student_id = auth.uid()
      and e.status = 'approved'
  )
);

drop policy if exists "Admins can manage live sessions" on public.course_live_sessions;
create policy "Admins can manage live sessions" on public.course_live_sessions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage live notification log" on public.live_session_notifications;
create policy "Admins can manage live notification log" on public.live_session_notifications
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.course_live_sessions to authenticated;
grant select, insert, update, delete on public.live_session_notifications to authenticated;
