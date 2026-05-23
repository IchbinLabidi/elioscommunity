drop policy if exists "Teachers can create their own answers" on public.answers;
drop policy if exists "Teachers can update their own answers" on public.answers;
drop policy if exists "Teachers can delete their own answers" on public.answers;

create policy "Teachers can create their own answers" on public.answers for insert
to authenticated with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher'
      and coalesce(p.is_blocked, false) = false
      and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked')
  )
  and exists (
    select 1 from public.questions q where q.id = question_id
      and q.status <> 'closed' and coalesce(q.is_hidden, false) = false
  )
);

create policy "Teachers can update their own answers" on public.answers for update
to authenticated using (
  teacher_id = auth.uid() and is_best = false and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid()
    and coalesce(p.is_blocked, false) = false
    and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
) with check (
  teacher_id = auth.uid() and is_best = false
  and exists (select 1 from public.profiles p where p.id = auth.uid()
    and coalesce(p.is_blocked, false) = false
    and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
);

create policy "Teachers can delete their own answers" on public.answers for delete
to authenticated using (
  teacher_id = auth.uid() and is_best = false and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid()
    and coalesce(p.is_blocked, false) = false
    and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
);

drop policy if exists "Teachers can create their own courses" on public.courses;
drop policy if exists "Teachers can update their own courses" on public.courses;
drop policy if exists "Teachers can delete their own courses" on public.courses;

create policy "Teachers can create their own courses" on public.courses for insert
to authenticated with check (
  teacher_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false
    and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
);

create policy "Teachers can update their own courses" on public.courses for update
to authenticated using ((teacher_id = auth.uid() and coalesce(is_hidden, false) = false) or public.is_admin())
with check (
  public.is_admin() or (teacher_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false
    and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked')))
);

create policy "Teachers can delete their own courses" on public.courses for delete
to authenticated using (public.is_admin() or (teacher_id = auth.uid() and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = auth.uid()
    and coalesce(p.is_blocked, false) = false
    and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))));
