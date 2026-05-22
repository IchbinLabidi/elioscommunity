alter table public.answers enable row level security;

drop policy if exists "Authenticated users can view answers" on public.answers;
drop policy if exists "Active teachers can answer open questions" on public.answers;
drop policy if exists "Teachers can create their own answers" on public.answers;
drop policy if exists "Teachers can update their own answers" on public.answers;
drop policy if exists "Teachers can delete their own answers" on public.answers;
drop policy if exists "Admins can manage answers" on public.answers;

create policy "Authenticated users can view answers"
  on public.answers for select
  to authenticated
  using (true);

create policy "Teachers can create their own answers"
  on public.answers for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'teacher'
    )
    and exists (
      select 1 from public.questions q
      where q.id = question_id and q.status <> 'closed'
    )
  );

create policy "Teachers can update their own answers"
  on public.answers for update
  to authenticated
  using (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'teacher'
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'teacher'
    )
  );

create policy "Teachers can delete their own answers"
  on public.answers for delete
  to authenticated
  using (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'teacher'
    )
  );

create policy "Admins can manage answers"
  on public.answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.answers to authenticated;
grant execute on function public.mark_best_answer(uuid, uuid) to authenticated;
