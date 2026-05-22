alter table public.course_lessons enable row level security;

drop policy if exists "Public can read accessible course lessons" on public.course_lessons;
drop policy if exists "Teachers can read their own course lessons" on public.course_lessons;
drop policy if exists "Teachers can create their own course lessons" on public.course_lessons;
drop policy if exists "Teachers can update their own course lessons" on public.course_lessons;
drop policy if exists "Teachers can delete their own course lessons" on public.course_lessons;
drop policy if exists "Admins can manage course lessons" on public.course_lessons;

create policy "Public can read accessible course lessons"
  on public.course_lessons for select
  to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.courses c
      where c.id = course_id
        and c.is_published = true
        and (c.price <= 0 or course_lessons.is_free_preview = true)
    )
  );

create policy "Teachers can read their own course lessons"
  on public.course_lessons for select
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

create policy "Teachers can create their own course lessons"
  on public.course_lessons for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
  );

create policy "Teachers can update their own course lessons"
  on public.course_lessons for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (teacher_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()))
  );

create policy "Teachers can delete their own course lessons"
  on public.course_lessons for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

create policy "Admins can manage course lessons"
  on public.course_lessons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.course_lessons to anon, authenticated;
grant insert, update, delete on public.course_lessons to authenticated;
