alter table public.courses
  alter column is_published set default false;

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  module_order integer not null default 1,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  chapter_order integer not null default 1,
  is_free_preview boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_modules drop constraint if exists course_modules_order_check;
alter table public.course_modules add constraint course_modules_order_check check (module_order >= 1);
alter table public.course_chapters drop constraint if exists course_chapters_order_check;
alter table public.course_chapters add constraint course_chapters_order_check check (chapter_order >= 1);

create index if not exists course_modules_course_id_idx on public.course_modules(course_id);
create index if not exists course_modules_teacher_id_idx on public.course_modules(teacher_id);
create index if not exists course_modules_module_order_idx on public.course_modules(module_order);
create index if not exists course_chapters_module_id_idx on public.course_chapters(module_id);
create index if not exists course_chapters_course_id_idx on public.course_chapters(course_id);
create index if not exists course_chapters_teacher_id_idx on public.course_chapters(teacher_id);
create index if not exists course_chapters_chapter_order_idx on public.course_chapters(chapter_order);
create index if not exists course_chapters_is_free_preview_idx on public.course_chapters(is_free_preview);

drop trigger if exists course_modules_touch_updated_at on public.course_modules;
create trigger course_modules_touch_updated_at before update on public.course_modules
for each row execute procedure public.touch_updated_at();

drop trigger if exists course_chapters_touch_updated_at on public.course_chapters;
create trigger course_chapters_touch_updated_at before update on public.course_chapters
for each row execute procedure public.touch_updated_at();
