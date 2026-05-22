alter table public.subjects enable row level security;

drop policy if exists "Public can read published subjects" on public.subjects;
drop policy if exists "Admins can manage subjects" on public.subjects;

create policy "Public can read published subjects" on public.subjects for select
to anon, authenticated
using (is_published = true or public.is_admin());

create policy "Admins can manage subjects" on public.subjects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.subjects to anon, authenticated;
grant insert, update, delete on public.subjects to authenticated;

insert into storage.buckets(id, name, public)
values ('chapter-videos','chapter-videos', false),
       ('chapter-attachments','chapter-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Teachers upload own chapter videos" on storage.objects;
drop policy if exists "Teachers manage own chapter videos" on storage.objects;
drop policy if exists "Teachers upload own chapter attachments" on storage.objects;
drop policy if exists "Teachers manage own chapter attachments" on storage.objects;

create policy "Teachers upload own chapter videos" on storage.objects for insert to authenticated
with check (bucket_id = 'chapter-videos' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers manage own chapter videos" on storage.objects for all to authenticated
using (bucket_id = 'chapter-videos' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'chapter-videos' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers upload own chapter attachments" on storage.objects for insert to authenticated
with check (bucket_id = 'chapter-attachments' and (owner = auth.uid() or public.is_admin()));

create policy "Teachers manage own chapter attachments" on storage.objects for all to authenticated
using (bucket_id = 'chapter-attachments' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'chapter-attachments' and (owner = auth.uid() or public.is_admin()));
