alter table public.ratings enable row level security;
alter table public.ratings no force row level security;

drop policy if exists "Public can view approved teacher ratings" on public.ratings;
drop policy if exists "Students can rate teachers after help" on public.ratings;
drop policy if exists "Students can update their own ratings" on public.ratings;
drop policy if exists "Admins can manage ratings" on public.ratings;
drop policy if exists "Authenticated users can read ratings" on public.ratings;
drop policy if exists "Students can insert valid ratings" on public.ratings;
drop policy if exists "Students can update own ratings" on public.ratings;
drop policy if exists "Students can delete own ratings" on public.ratings;

create policy "Authenticated users can read ratings"
  on public.ratings for select
  to authenticated
  using (true);

create policy "Students can insert valid ratings"
  on public.ratings for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and teacher_id <> auth.uid()
    and rating between 1 and 5
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student')
    and exists (select 1 from public.questions q where q.id = question_id and q.student_id = auth.uid())
    and exists (select 1 from public.answers a where a.question_id = question_id and a.teacher_id = teacher_id)
    and (
      answer_id is null
      or exists (select 1 from public.answers a where a.id = answer_id and a.question_id = question_id and a.teacher_id = teacher_id)
    )
  );

create policy "Students can update own ratings"
  on public.ratings for update
  to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      student_id = auth.uid()
      and teacher_id <> auth.uid()
      and rating between 1 and 5
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student')
      and exists (select 1 from public.questions q where q.id = question_id and q.student_id = auth.uid())
      and exists (select 1 from public.answers a where a.question_id = question_id and a.teacher_id = teacher_id)
      and (
        answer_id is null
        or exists (select 1 from public.answers a where a.id = answer_id and a.question_id = question_id and a.teacher_id = teacher_id)
      )
    )
  );

create policy "Students can delete own ratings"
  on public.ratings for delete
  to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "Admins can manage ratings"
  on public.ratings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.ratings to authenticated;
grant execute on function public.create_teacher_rating(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.update_teacher_rating(uuid, integer, text) to authenticated;
grant execute on function public.get_teacher_rating_stats(uuid) to anon, authenticated;
grant execute on function public.list_teacher_ratings(uuid) to anon, authenticated;
