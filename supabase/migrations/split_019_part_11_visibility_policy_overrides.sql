drop policy if exists "Authenticated users can view questions" on public.questions;
drop policy if exists "Students can create their own questions" on public.questions;
drop policy if exists "Students can update their own questions" on public.questions;
drop policy if exists "Students can delete their own open questions" on public.questions;

create policy "Authenticated users can view questions" on public.questions for select
to authenticated using (coalesce(is_hidden, false) = false or public.is_admin());

create policy "Students can create their own questions" on public.questions for insert
to authenticated with check (
  student_id = auth.uid() and status = 'open'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
);

create policy "Students can update their own questions" on public.questions for update
to authenticated using (
  student_id = auth.uid() and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
) with check (
  student_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
);

create policy "Students can delete their own open questions" on public.questions for delete
to authenticated using (
  student_id = auth.uid() and status = 'open' and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
);

drop policy if exists "Authenticated users can view answers" on public.answers;
drop policy if exists "Teachers can create their own answers" on public.answers;
drop policy if exists "Teachers can update their own answers" on public.answers;
drop policy if exists "Teachers can delete their own answers" on public.answers;

create policy "Authenticated users can view answers" on public.answers for select
to authenticated using (coalesce(is_hidden, false) = false or public.is_admin());

create policy "Teachers can create their own answers" on public.answers for insert
to authenticated with check (
  teacher_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
  and exists (select 1 from public.questions q where q.id = question_id and q.status <> 'closed' and coalesce(q.is_hidden, false) = false)
);

create policy "Teachers can update their own answers" on public.answers for update
to authenticated using (
  teacher_id = auth.uid() and is_best = false and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
) with check (
  teacher_id = auth.uid() and is_best = false
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
);

create policy "Teachers can delete their own answers" on public.answers for delete
to authenticated using (
  teacher_id = auth.uid() and is_best = false and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
);

drop policy if exists "Authenticated users can read ratings" on public.ratings;
drop policy if exists "Students can insert valid ratings" on public.ratings;
drop policy if exists "Students can update own ratings" on public.ratings;
drop policy if exists "Students can delete own ratings" on public.ratings;

create policy "Authenticated users can read ratings" on public.ratings for select
to authenticated using (coalesce(is_hidden, false) = false or public.is_admin());

create policy "Students can insert valid ratings" on public.ratings for insert
to authenticated with check (
  student_id = auth.uid() and teacher_id <> auth.uid() and rating between 1 and 5
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
  and exists (select 1 from public.questions q where q.id = question_id and q.student_id = auth.uid() and coalesce(q.is_hidden, false) = false)
  and exists (select 1 from public.answers a where a.question_id = question_id and a.teacher_id = teacher_id and coalesce(a.is_hidden, false) = false)
);
