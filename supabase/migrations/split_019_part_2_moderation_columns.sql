alter table public.questions
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.answers
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.answer_comments
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.ratings
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.courses
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.course_modules
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.course_chapters
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;
