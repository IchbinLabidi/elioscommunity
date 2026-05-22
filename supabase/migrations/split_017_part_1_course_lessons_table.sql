alter table public.courses
  alter column format set default 'recorded';

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  lesson_order integer not null default 1,
  video_url text,
  video_path text,
  pdf_url text,
  pdf_path text,
  is_free_preview boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_lessons
  add column if not exists description text,
  add column if not exists video_url text,
  add column if not exists video_path text,
  add column if not exists pdf_url text,
  add column if not exists pdf_path text,
  add column if not exists is_free_preview boolean not null default false,
  add column if not exists is_published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.course_lessons drop constraint if exists course_lessons_order_check;
alter table public.course_lessons add constraint course_lessons_order_check check (lesson_order >= 1);

create index if not exists course_lessons_course_id_idx on public.course_lessons(course_id);
create index if not exists course_lessons_teacher_id_idx on public.course_lessons(teacher_id);
create index if not exists course_lessons_lesson_order_idx on public.course_lessons(lesson_order);
create index if not exists course_lessons_is_published_idx on public.course_lessons(is_published);

drop trigger if exists course_lessons_touch_updated_at on public.course_lessons;
create trigger course_lessons_touch_updated_at
  before update on public.course_lessons
  for each row execute procedure public.touch_updated_at();
