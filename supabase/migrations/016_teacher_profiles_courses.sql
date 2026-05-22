alter table public.profiles
  add column if not exists headline text,
  add column if not exists location text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists facebook_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text,
  add column if not exists subjects text[] default '{}',
  add column if not exists education text,
  add column if not exists languages text[] default '{}',
  add column if not exists is_verified boolean not null default false;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  subject text not null,
  level text not null,
  price numeric not null default 0,
  currency text not null default 'TND',
  duration text,
  format text not null default 'online',
  cover_url text,
  course_link text,
  contact_whatsapp text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses
  add column if not exists currency text not null default 'TND',
  add column if not exists duration text,
  add column if not exists format text not null default 'online',
  add column if not exists contact_whatsapp text,
  add column if not exists is_published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.courses drop constraint if exists courses_format_check;
alter table public.courses add constraint courses_format_check check (format in ('online', 'onsite', 'hybrid', 'recorded'));
alter table public.courses drop constraint if exists courses_price_check;
alter table public.courses add constraint courses_price_check check (price >= 0);

create index if not exists courses_teacher_id_idx on public.courses(teacher_id);
create index if not exists courses_subject_idx on public.courses(subject);
create index if not exists courses_level_idx on public.courses(level);
create index if not exists courses_is_published_idx on public.courses(is_published);
create index if not exists courses_created_at_idx on public.courses(created_at desc);
create index if not exists profiles_subjects_idx on public.profiles using gin(subjects);

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
  before update on public.courses
  for each row execute procedure public.touch_updated_at();

drop view if exists public.teacher_public_stats;
create or replace view public.teacher_public_stats
with (security_invoker = false) as
select
  p.id as teacher_id,
  coalesce(avg(r.rating), 0)::numeric(3,2) as average_rating,
  count(distinct r.id)::integer as total_ratings,
  count(distinct r.id) filter (where nullif(btrim(coalesce(r.review, '')), '') is not null)::integer as total_reviews,
  count(distinct a.id)::integer as total_answers,
  count(distinct a.id) filter (where a.is_best)::integer as total_best_answers,
  count(distinct c.id) filter (where c.is_published)::integer as total_courses
from public.profiles p
left join public.ratings r on r.teacher_id = p.id
left join public.answers a on a.teacher_id = p.id
left join public.courses c on c.teacher_id = p.id
where p.role::text = 'teacher'
group by p.id;

grant select on public.teacher_public_stats to anon, authenticated;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('course-covers', 'course-covers', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view avatars" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
drop policy if exists "Public can view course covers" on storage.objects;
drop policy if exists "Teachers can upload their own course covers" on storage.objects;
drop policy if exists "Teachers can update their own course covers" on storage.objects;
drop policy if exists "Teachers can delete their own course covers" on storage.objects;

create policy "Public can view avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar" on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their own avatar" on storage.objects for update
using (bucket_id = 'avatars' and owner = auth.uid()) with check (bucket_id = 'avatars' and owner = auth.uid());
create policy "Users can delete their own avatar" on storage.objects for delete
using (bucket_id = 'avatars' and owner = auth.uid());

create policy "Public can view course covers" on storage.objects for select using (bucket_id = 'course-covers');
create policy "Teachers can upload their own course covers" on storage.objects for insert
with check (
  bucket_id = 'course-covers'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'teacher')
  and (storage.foldername(name))[1] = 'courses'
  and (storage.foldername(name))[2] = auth.uid()::text
);
create policy "Teachers can update their own course covers" on storage.objects for update
using (bucket_id = 'course-covers' and owner = auth.uid()) with check (bucket_id = 'course-covers' and owner = auth.uid());
create policy "Teachers can delete their own course covers" on storage.objects for delete
using (bucket_id = 'course-covers' and owner = auth.uid());
