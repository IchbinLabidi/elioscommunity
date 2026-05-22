create extension if not exists "pgcrypto";

create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.question_status as enum ('open', 'answered', 'closed');
create type public.report_status as enum ('pending', 'reviewed', 'dismissed');
create type public.report_target_type as enum ('question', 'answer', 'profile', 'course');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.user_role not null,
  avatar_url text,
  bio text,
  specialty text,
  experience text,
  is_blocked boolean not null default false,
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 5),
  description text not null check (char_length(trim(description)) >= 10),
  subject text not null check (char_length(trim(subject)) > 0),
  image_url text,
  status public.question_status not null default 'open',
  best_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) >= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions
  add constraint questions_best_answer_id_fkey
  foreign key (best_answer_id) references public.answers(id) on delete set null;

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text check (review is null or char_length(review) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, teacher_id, question_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  description text not null check (char_length(trim(description)) >= 10),
  price numeric(10,2) not null default 0 check (price >= 0),
  subject text not null check (char_length(trim(subject)) > 0),
  level text not null check (char_length(trim(level)) > 0),
  cover_url text,
  course_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, teacher_id),
  check (student_id <> teacher_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) >= 5),
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_idx on public.profiles(lower(email)) where email <> '';
create index profiles_role_idx on public.profiles(role);
create index profiles_specialty_idx on public.profiles(specialty);
create index questions_student_id_idx on public.questions(student_id);
create index questions_subject_idx on public.questions(subject);
create index questions_status_idx on public.questions(status);
create index questions_created_at_idx on public.questions(created_at desc);
create index answers_question_id_idx on public.answers(question_id);
create index answers_teacher_id_idx on public.answers(teacher_id);
create index ratings_teacher_id_idx on public.ratings(teacher_id);
create index ratings_question_id_idx on public.ratings(question_id);
create index courses_teacher_id_idx on public.courses(teacher_id);
create index courses_subject_idx on public.courses(subject);
create index follows_student_id_idx on public.follows(student_id);
create index follows_teacher_id_idx on public.follows(teacher_id);
create index reports_status_idx on public.reports(status);
create index reports_target_idx on public.reports(target_type, target_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create trigger questions_touch_updated_at
  before update on public.questions
  for each row execute procedure public.touch_updated_at();

create trigger answers_touch_updated_at
  before update on public.answers
  for each row execute procedure public.touch_updated_at();

create trigger ratings_touch_updated_at
  before update on public.ratings
  for each row execute procedure public.touch_updated_at();

create trigger courses_touch_updated_at
  before update on public.courses
  for each row execute procedure public.touch_updated_at();

create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute procedure public.touch_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_student()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'student', false)
$$;

create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'teacher', false)
$$;

create or replace function public.is_active_teacher(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'teacher'
      and is_approved
      and not is_blocked
  )
$$;

create or replace function public.is_active_student(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'student'
      and not is_blocked
  )
$$;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.role is distinct from new.role
    or old.is_blocked is distinct from new.is_blocked
    or old.is_approved is distinct from new.is_approved then
    raise exception 'Only admins can change profile role, approval, or block status';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_profile_privilege_escalation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  if new.raw_user_meta_data->>'role' in ('student', 'teacher') then
    requested_role := (new.raw_user_meta_data->>'role')::public.user_role;
  else
    requested_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email, role, specialty, is_approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    requested_role,
    new.raw_user_meta_data->>'specialty',
    case when requested_role = 'teacher' then false else true end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.validate_best_answer()
returns trigger
language plpgsql
as $$
begin
  if new.best_answer_id is not null and not exists (
    select 1
    from public.answers
    where id = new.best_answer_id
      and question_id = new.id
  ) then
    raise exception 'Best answer must belong to the same question';
  end if;

  if new.best_answer_id is not null then
    new.status := 'answered';
  end if;

  return new;
end;
$$;

create trigger questions_validate_best_answer
  before insert or update on public.questions
  for each row execute procedure public.validate_best_answer();

create or replace function public.student_can_rate_teacher(target_teacher uuid, target_question uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.questions q
    join public.answers a on a.question_id = q.id
    where q.id = target_question
      and q.student_id = auth.uid()
      and a.teacher_id = target_teacher
      and q.best_answer_id = a.id
  )
$$;

create or replace view public.teacher_stats
with (security_invoker = true) as
select
  p.id as teacher_id,
  coalesce(avg(r.rating), 0)::numeric(3,2) as rating_average,
  count(distinct r.id)::integer as rating_count,
  count(distinct a.id)::integer as answer_count,
  count(distinct c.id)::integer as course_count
from public.profiles p
left join public.ratings r on r.teacher_id = p.id
left join public.answers a on a.teacher_id = p.id
left join public.courses c on c.teacher_id = p.id
where p.role = 'teacher'
  and p.is_approved
  and not p.is_blocked
group by p.id;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.ratings enable row level security;
alter table public.courses enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;

alter table public.profiles force row level security;
alter table public.questions force row level security;
alter table public.answers force row level security;
alter table public.ratings force row level security;
alter table public.courses force row level security;
alter table public.follows force row level security;
alter table public.reports force row level security;

create policy "Public can view approved teachers"
  on public.profiles for select
  using (role = 'teacher' and is_approved and not is_blocked);

create policy "Authenticated users can view active profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated' and not is_blocked);

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id and not is_blocked)
  with check (auth.uid() = id);

create policy "Authenticated users can create their own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role in ('student', 'teacher')
    and (
      (role = 'student' and is_approved = true)
      or (role = 'teacher' and is_approved = false)
    )
  );

create policy "Admins can manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Authenticated users can view questions"
  on public.questions for select
  using (auth.role() = 'authenticated');

create policy "Students can create their own questions"
  on public.questions for insert
  with check (
    student_id = auth.uid()
    and public.is_active_student(auth.uid())
    and status = 'open'
    and best_answer_id is null
  );

create policy "Students can update their own questions"
  on public.questions for update
  using (student_id = auth.uid() and public.is_active_student(auth.uid()))
  with check (student_id = auth.uid());

create policy "Admins can manage questions"
  on public.questions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Authenticated users can view answers"
  on public.answers for select
  using (auth.role() = 'authenticated');

create policy "Active teachers can answer open questions"
  on public.answers for insert
  with check (
    teacher_id = auth.uid()
    and public.is_active_teacher(auth.uid())
    and exists (
      select 1
      from public.questions q
      where q.id = question_id
        and q.status = 'open'
        and q.student_id <> auth.uid()
    )
  );

create policy "Teachers can update their own answers"
  on public.answers for update
  using (teacher_id = auth.uid() and public.is_active_teacher(auth.uid()))
  with check (teacher_id = auth.uid());

create policy "Admins can manage answers"
  on public.answers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can view approved teacher ratings"
  on public.ratings for select
  using (public.is_active_teacher(teacher_id));

create policy "Students can rate the best answer teacher"
  on public.ratings for insert
  with check (
    student_id = auth.uid()
    and public.is_active_student(auth.uid())
    and public.student_can_rate_teacher(teacher_id, question_id)
  );

create policy "Students can update their own ratings"
  on public.ratings for update
  using (student_id = auth.uid() and public.is_active_student(auth.uid()))
  with check (
    student_id = auth.uid()
    and public.student_can_rate_teacher(teacher_id, question_id)
  );

create policy "Admins can manage ratings"
  on public.ratings for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can view approved teacher courses"
  on public.courses for select
  using (public.is_active_teacher(teacher_id));

create policy "Active teachers can create courses"
  on public.courses for insert
  with check (teacher_id = auth.uid() and public.is_active_teacher(auth.uid()));

create policy "Teachers can update their own courses"
  on public.courses for update
  using (teacher_id = auth.uid() and public.is_active_teacher(auth.uid()))
  with check (teacher_id = auth.uid());

create policy "Teachers can delete their own courses"
  on public.courses for delete
  using (teacher_id = auth.uid() and public.is_active_teacher(auth.uid()));

create policy "Admins can manage courses"
  on public.courses for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view relevant follows"
  on public.follows for select
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());

create policy "Students can follow approved teachers"
  on public.follows for insert
  with check (
    student_id = auth.uid()
    and public.is_active_student(auth.uid())
    and public.is_active_teacher(teacher_id)
  );

create policy "Students can unfollow teachers"
  on public.follows for delete
  using (student_id = auth.uid() and public.is_active_student(auth.uid()));

create policy "Authenticated users can create reports"
  on public.reports for insert
  with check (reporter_id = auth.uid() and auth.role() = 'authenticated');

create policy "Users can view their own reports"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy "Admins can update reports"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete reports"
  on public.reports for delete
  using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('question-images', 'question-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('course-covers', 'course-covers', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "Public can view question images"
  on storage.objects for select
  using (bucket_id = 'question-images');

create policy "Students can upload their own question images"
  on storage.objects for insert
  with check (
    bucket_id = 'question-images'
    and public.is_active_student(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can update their own question images"
  on storage.objects for update
  using (bucket_id = 'question-images' and owner = auth.uid())
  with check (bucket_id = 'question-images' and owner = auth.uid());

create policy "Students can delete their own question images"
  on storage.objects for delete
  using (bucket_id = 'question-images' and owner = auth.uid());

create policy "Public can view course covers"
  on storage.objects for select
  using (bucket_id = 'course-covers');

create policy "Teachers can upload their own course covers"
  on storage.objects for insert
  with check (
    bucket_id = 'course-covers'
    and public.is_active_teacher(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Teachers can update their own course covers"
  on storage.objects for update
  using (bucket_id = 'course-covers' and owner = auth.uid())
  with check (bucket_id = 'course-covers' and owner = auth.uid());

create policy "Teachers can delete their own course covers"
  on storage.objects for delete
  using (bucket_id = 'course-covers' and owner = auth.uid());

grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.answers to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.reports to authenticated;

grant select on public.courses to anon;
grant select on public.ratings to anon;
grant select on public.teacher_stats to anon, authenticated;
