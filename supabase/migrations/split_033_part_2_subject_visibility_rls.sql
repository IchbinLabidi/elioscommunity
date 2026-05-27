drop policy if exists "Public can read published subjects" on public.subjects;
drop policy if exists "Admins can manage subjects" on public.subjects;

create policy "Public can read published subjects" on public.subjects for select
to anon, authenticated
using (
  (is_published = true and coalesce(is_hidden, false) = false)
  or public.is_admin()
);

create policy "Admins can manage subjects" on public.subjects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.subjects to anon, authenticated;
grant insert, update, delete on public.subjects to authenticated;
