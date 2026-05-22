drop policy if exists "Students can update own ratings" on public.ratings;
drop policy if exists "Students can delete own ratings" on public.ratings;

create policy "Students can update own ratings" on public.ratings for update
to authenticated using (
  (student_id = auth.uid() and coalesce(is_hidden, false) = false) or public.is_admin()
) with check (
  public.is_admin()
  or (
    student_id = auth.uid()
    and teacher_id <> auth.uid()
    and rating between 1 and 5
    and coalesce(is_hidden, false) = false
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student' and coalesce(p.is_blocked, false) = false)
    and exists (select 1 from public.questions q where q.id = question_id and q.student_id = auth.uid() and coalesce(q.is_hidden, false) = false)
    and exists (select 1 from public.answers a where a.question_id = question_id and a.teacher_id = teacher_id and coalesce(a.is_hidden, false) = false)
  )
);

create policy "Students can delete own ratings" on public.ratings for delete
to authenticated using (
  (student_id = auth.uid() and coalesce(is_hidden, false) = false and exists (
    select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_blocked, false) = false
  ))
  or public.is_admin()
);
