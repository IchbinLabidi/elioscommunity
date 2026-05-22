alter table public.video_comments enable row level security;
alter table public.video_notes enable row level security;
alter table public.video_progress enable row level security;

drop policy if exists "Video comments readable with access" on public.video_comments;
drop policy if exists "Video comments owners can update" on public.video_comments;
drop policy if exists "Video comments owners can delete" on public.video_comments;
drop policy if exists "Admins manage video comments" on public.video_comments;

create policy "Video comments readable with access" on public.video_comments for select
to anon, authenticated
using ((coalesce(is_hidden, false) = false and public.can_access_course_video(video_id)) or public.is_admin());

create policy "Video comments owners can update" on public.video_comments for update
to authenticated
using (user_id = auth.uid() and coalesce(is_hidden, false) = false)
with check (user_id = auth.uid());

create policy "Video comments owners can delete" on public.video_comments for delete
to authenticated using (user_id = auth.uid());

create policy "Admins manage video comments" on public.video_comments for all
to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students manage own video notes" on public.video_notes;
drop policy if exists "Students read own video notes" on public.video_notes;

create policy "Students read own video notes" on public.video_notes for select
to authenticated using (student_id = auth.uid());

create policy "Students manage own video notes" on public.video_notes for all
to authenticated
using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
);

drop policy if exists "Students manage own video progress" on public.video_progress;
drop policy if exists "Students read own video progress" on public.video_progress;

create policy "Students read own video progress" on public.video_progress for select
to authenticated using (student_id = auth.uid());

create policy "Students manage own video progress" on public.video_progress for all
to authenticated
using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
);

grant select on public.video_comments to anon, authenticated;
grant insert, update, delete on public.video_comments to authenticated;
grant select, insert, update, delete on public.video_notes to authenticated;
grant select, insert, update, delete on public.video_progress to authenticated;
