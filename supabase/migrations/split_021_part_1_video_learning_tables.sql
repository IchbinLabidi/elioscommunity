create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.chapter_videos(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.video_comments(id) on delete cascade,
  content text not null,
  timestamp_seconds integer,
  is_hidden boolean not null default false,
  hidden_reason text,
  moderated_by uuid references public.profiles(id),
  moderated_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.video_notes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.chapter_videos(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  timestamp_seconds integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.chapter_videos(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  watched_seconds integer not null default 0,
  completed boolean not null default false,
  last_watched_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(video_id, student_id)
);

create index if not exists video_comments_video_id_idx on public.video_comments(video_id);
create index if not exists video_comments_course_id_idx on public.video_comments(course_id);
create index if not exists video_comments_user_id_idx on public.video_comments(user_id);
create index if not exists video_comments_parent_idx on public.video_comments(parent_comment_id);
create index if not exists video_comments_created_at_idx on public.video_comments(created_at);
create index if not exists video_comments_hidden_idx on public.video_comments(is_hidden);

create index if not exists video_notes_video_id_idx on public.video_notes(video_id);
create index if not exists video_notes_student_id_idx on public.video_notes(student_id);
create index if not exists video_notes_course_id_idx on public.video_notes(course_id);
create index if not exists video_notes_created_at_idx on public.video_notes(created_at);

create index if not exists video_progress_video_id_idx on public.video_progress(video_id);
create index if not exists video_progress_student_id_idx on public.video_progress(student_id);
create index if not exists video_progress_course_id_idx on public.video_progress(course_id);

drop trigger if exists video_comments_touch_updated_at on public.video_comments;
create trigger video_comments_touch_updated_at before update on public.video_comments
for each row execute function public.touch_updated_at();

drop trigger if exists video_notes_touch_updated_at on public.video_notes;
create trigger video_notes_touch_updated_at before update on public.video_notes
for each row execute function public.touch_updated_at();

drop trigger if exists video_progress_touch_updated_at on public.video_progress;
create trigger video_progress_touch_updated_at before update on public.video_progress
for each row execute function public.touch_updated_at();
