alter table public.course_enrollments enable row level security;

drop policy if exists "Students can read own enrollments" on public.course_enrollments;
drop policy if exists "Teachers can read course enrollments" on public.course_enrollments;
drop policy if exists "Students can update pending enrollments" on public.course_enrollments;
drop policy if exists "Admins can manage enrollments" on public.course_enrollments;

create policy "Students can read own enrollments" on public.course_enrollments for select
to authenticated using (student_id = auth.uid());

create policy "Teachers can read course enrollments" on public.course_enrollments for select
to authenticated using (teacher_id = auth.uid() or public.is_admin());

create policy "Students can update pending enrollments" on public.course_enrollments for update
to authenticated using (
  student_id = auth.uid()
  and status in ('pending','rejected')
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
) with check (
  student_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

create policy "Admins can manage enrollments" on public.course_enrollments for all
to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.course_enrollments to authenticated;
