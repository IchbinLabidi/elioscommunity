alter table public.profiles enable row level security;

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Public can read teacher profiles" on public.profiles;
drop policy if exists "Admins can manage all profiles" on public.profiles;

create policy "Public can read teacher profiles"
  on public.profiles for select
  to anon, authenticated
  using (role::text = 'teacher' and coalesce(is_blocked, false) = false);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role::text in ('student', 'teacher', 'admin')
    and role::text <> 'admin'
  );

create policy "Admins can manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.courses enable row level security;

drop policy if exists "Public can view approved teacher courses" on public.courses;
drop policy if exists "Public can read published courses" on public.courses;
drop policy if exists "Active teachers can create courses" on public.courses;
drop policy if exists "Teachers can read their own courses" on public.courses;
drop policy if exists "Teachers can create their own courses" on public.courses;
drop policy if exists "Teachers can update their own courses" on public.courses;
drop policy if exists "Teachers can delete their own courses" on public.courses;
drop policy if exists "Admins can manage courses" on public.courses;

create policy "Public can read published courses"
  on public.courses for select
  to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.profiles p
      where p.id = teacher_id
        and p.role::text = 'teacher'
        and coalesce(p.is_blocked, false) = false
    )
  );

create policy "Teachers can read their own courses"
  on public.courses for select
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

create policy "Teachers can create their own courses"
  on public.courses for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
        and coalesce(p.is_blocked, false) = false
    )
  );

create policy "Teachers can update their own courses"
  on public.courses for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      teacher_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role::text = 'teacher'
          and coalesce(p.is_blocked, false) = false
      )
    )
  );

create policy "Teachers can delete their own courses"
  on public.courses for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

create policy "Admins can manage courses"
  on public.courses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
