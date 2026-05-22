create table if not exists public.chapter_videos (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  video_order integer not null default 1,
  video_url text,
  video_path text,
  duration_seconds integer,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapter_attachments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_url text,
  file_path text,
  file_type text,
  file_size integer,
  attachment_order integer not null default 1,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chapter_videos drop constraint if exists chapter_videos_order_check;
alter table public.chapter_videos add constraint chapter_videos_order_check check (video_order >= 1);
alter table public.chapter_attachments drop constraint if exists chapter_attachments_order_check;
alter table public.chapter_attachments add constraint chapter_attachments_order_check check (attachment_order >= 1);

create index if not exists chapter_videos_chapter_id_idx on public.chapter_videos(chapter_id);
create index if not exists chapter_videos_course_id_idx on public.chapter_videos(course_id);
create index if not exists chapter_videos_teacher_id_idx on public.chapter_videos(teacher_id);
create index if not exists chapter_videos_video_order_idx on public.chapter_videos(video_order);
create index if not exists chapter_attachments_chapter_id_idx on public.chapter_attachments(chapter_id);
create index if not exists chapter_attachments_course_id_idx on public.chapter_attachments(course_id);
create index if not exists chapter_attachments_teacher_id_idx on public.chapter_attachments(teacher_id);
create index if not exists chapter_attachments_order_idx on public.chapter_attachments(attachment_order);

drop trigger if exists chapter_videos_touch_updated_at on public.chapter_videos;
create trigger chapter_videos_touch_updated_at before update on public.chapter_videos
for each row execute procedure public.touch_updated_at();

drop trigger if exists chapter_attachments_touch_updated_at on public.chapter_attachments;
create trigger chapter_attachments_touch_updated_at before update on public.chapter_attachments
for each row execute procedure public.touch_updated_at();
