create or replace function public.can_manage_course_content(
  target_teacher_id uuid,
  target_course_id uuid
) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or (
      auth.uid() = target_teacher_id
      and exists (select 1 from public.courses c where c.id = target_course_id and c.teacher_id = auth.uid())
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher')
    );
$$;

grant execute on function public.can_manage_course_content(uuid, uuid) to authenticated;

alter table public.course_modules enable row level security;
alter table public.course_chapters enable row level security;

drop policy if exists "Public can read published course modules" on public.course_modules;
drop policy if exists "Teachers can manage own course modules" on public.course_modules;
drop policy if exists "Admins can manage course modules" on public.course_modules;
drop policy if exists "Public can read preview course chapters" on public.course_chapters;
drop policy if exists "Teachers can manage own course chapters" on public.course_chapters;
drop policy if exists "Admins can manage course chapters" on public.course_chapters;

create policy "Public can read published course modules" on public.course_modules for select
to anon, authenticated
using (
  is_published = true
  and exists (select 1 from public.courses c where c.id = course_modules.course_id and c.is_published = true)
);

create policy "Teachers can manage own course modules" on public.course_modules for all
to authenticated
using (public.can_manage_course_content(teacher_id, course_id))
with check (public.can_manage_course_content(teacher_id, course_id));

create policy "Public can read preview course chapters" on public.course_chapters for select
to anon, authenticated
using (
  is_published = true
  and exists (
    select 1 from public.courses c
    join public.course_modules m on m.id = course_chapters.module_id
    where c.id = course_chapters.course_id
      and c.is_published = true
      and m.is_published = true
      and (c.price <= 0 or course_chapters.is_free_preview = true)
  )
);

create policy "Teachers can manage own course chapters" on public.course_chapters for all
to authenticated
using (public.can_manage_course_content(teacher_id, course_id))
with check (
  public.can_manage_course_content(teacher_id, course_id)
  and exists (select 1 from public.course_modules m where m.id = course_chapters.module_id and m.course_id = course_chapters.course_id)
);

grant select on public.course_modules, public.course_chapters to anon, authenticated;
grant insert, update, delete on public.course_modules, public.course_chapters to authenticated;
