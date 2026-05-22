alter table public.answers enable row level security;
alter table public.answers no force row level security;

drop policy if exists "Teachers can update their own answers" on public.answers;
drop policy if exists "Teachers can delete their own answers" on public.answers;
drop policy if exists "Admins can manage answers" on public.answers;

create policy "Teachers can update their own answers"
  on public.answers for update
  to authenticated
  using (
    teacher_id = auth.uid()
    and is_best = false
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
  )
  with check (
    teacher_id = auth.uid()
    and is_best = false
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
  );

create policy "Teachers can delete their own answers"
  on public.answers for delete
  to authenticated
  using (
    teacher_id = auth.uid()
    and is_best = false
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
  );

create policy "Admins can manage answers"
  on public.answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
