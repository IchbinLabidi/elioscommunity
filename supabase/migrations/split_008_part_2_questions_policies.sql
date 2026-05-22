alter table public.questions enable row level security;

drop policy if exists "Authenticated users can view questions" on public.questions;
drop policy if exists "Students can create their own questions" on public.questions;
drop policy if exists "Students can update their own questions" on public.questions;
drop policy if exists "Students can delete their own open questions" on public.questions;
drop policy if exists "Admins can manage questions" on public.questions;

create policy "Authenticated users can view questions"
  on public.questions for select
  to authenticated
  using (true);

create policy "Students can create their own questions"
  on public.questions for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Students can update their own questions"
  on public.questions for update
  to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  )
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Students can delete their own open questions"
  on public.questions for delete
  to authenticated
  using (
    student_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Admins can manage questions"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
