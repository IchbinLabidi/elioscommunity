drop policy if exists "Public can read published courses" on public.courses;
drop policy if exists "Teachers can read their own courses" on public.courses;
drop policy if exists "Teachers can update their own courses" on public.courses;
drop policy if exists "Teachers can delete their own courses" on public.courses;

create policy "Public can read published courses" on public.courses for select
to anon, authenticated using (
  is_published = true and coalesce(is_hidden, false) = false
  and exists (select 1 from public.profiles p where p.id = teacher_id and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
);

create policy "Teachers can read their own courses" on public.courses for select
to authenticated using ((teacher_id = auth.uid() and coalesce(is_hidden, false) = false) or public.is_admin());

create policy "Teachers can update their own courses" on public.courses for update
to authenticated using (
  (teacher_id = auth.uid() and coalesce(is_hidden, false) = false) or public.is_admin()
) with check (
  public.is_admin()
  or (teacher_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false))
);

create policy "Teachers can delete their own courses" on public.courses for delete
to authenticated using (
  (teacher_id = auth.uid() and coalesce(is_hidden, false) = false and exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_blocked, false) = false))
  or public.is_admin()
);

create or replace function public.can_manage_course_content(target_teacher_id uuid, target_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    auth.uid() = target_teacher_id
    and exists (select 1 from public.courses c where c.id = target_course_id and c.teacher_id = auth.uid() and coalesce(c.is_hidden, false) = false)
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false)
  );
$$;

create or replace function public.can_read_chapter_content(target_course_id uuid, target_module_id uuid, target_chapter_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.course_chapters ch
    join public.course_modules m on m.id = ch.module_id
    join public.courses c on c.id = ch.course_id
    join public.profiles p on p.id = c.teacher_id
    where ch.id = target_chapter_id and ch.module_id = target_module_id and ch.course_id = target_course_id
      and ch.is_published = true and m.is_published = true and c.is_published = true
      and coalesce(ch.is_hidden, false) = false and coalesce(m.is_hidden, false) = false and coalesce(c.is_hidden, false) = false
      and coalesce(p.is_blocked, false) = false and (c.price <= 0 or ch.is_free_preview = true)
  );
$$;

drop policy if exists "Public can read published course modules" on public.course_modules;
create policy "Public can read published course modules" on public.course_modules for select
to anon, authenticated using (
  is_published = true and coalesce(is_hidden, false) = false
  and exists (select 1 from public.courses c where c.id = course_modules.course_id and c.is_published = true and coalesce(c.is_hidden, false) = false)
);

drop policy if exists "Public can read preview course chapters" on public.course_chapters;
create policy "Public can read preview course chapters" on public.course_chapters for select
to anon, authenticated using (
  is_published = true and coalesce(is_hidden, false) = false
  and exists (
    select 1 from public.courses c join public.course_modules m on m.id = course_chapters.module_id
    where c.id = course_chapters.course_id and c.is_published = true and m.is_published = true
      and coalesce(c.is_hidden, false) = false and coalesce(m.is_hidden, false) = false
      and (c.price <= 0 or course_chapters.is_free_preview = true)
  )
);
