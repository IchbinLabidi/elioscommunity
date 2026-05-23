alter table public.courses
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_at timestamptz,
  add column if not exists featured_by uuid references public.profiles(id) on delete set null,
  add column if not exists admin_review_status text not null default 'pending',
  add column if not exists admin_review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists deleted_reason text;

alter table public.courses drop constraint if exists courses_admin_review_status_check;
alter table public.courses add constraint courses_admin_review_status_check
  check (admin_review_status in ('pending', 'approved', 'needs_changes', 'rejected'));

alter table public.course_chapters
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null;

alter table public.chapter_videos
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null;

alter table public.chapter_attachments
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null;

create index if not exists courses_admin_review_idx on public.courses(admin_review_status);
create index if not exists courses_featured_idx on public.courses(is_featured);
create index if not exists courses_deleted_idx on public.courses(is_deleted);
