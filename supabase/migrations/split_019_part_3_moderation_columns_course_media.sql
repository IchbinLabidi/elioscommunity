alter table public.chapter_videos
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.chapter_attachments
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

create index if not exists questions_is_hidden_idx on public.questions(is_hidden);
create index if not exists answers_is_hidden_idx on public.answers(is_hidden);
create index if not exists answer_comments_is_hidden_idx on public.answer_comments(is_hidden);
create index if not exists ratings_is_hidden_idx on public.ratings(is_hidden);
create index if not exists courses_is_hidden_idx on public.courses(is_hidden);
create index if not exists course_modules_is_hidden_idx on public.course_modules(is_hidden);
create index if not exists course_chapters_is_hidden_idx on public.course_chapters(is_hidden);
create index if not exists chapter_videos_is_hidden_idx on public.chapter_videos(is_hidden);
create index if not exists chapter_attachments_is_hidden_idx on public.chapter_attachments(is_hidden);
