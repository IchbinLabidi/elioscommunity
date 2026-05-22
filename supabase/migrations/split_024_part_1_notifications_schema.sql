create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in (
    'question_answered',
    'answer_replied',
    'best_answer_selected',
    'teacher_followed',
    'teacher_new_course',
    'course_enrollment_submitted',
    'course_enrollment_approved',
    'course_enrollment_rejected',
    'video_comment',
    'rating_received',
    'report_resolved',
    'admin_message'
  )),
  title text not null,
  message text,
  target_type text,
  target_id uuid,
  target_url text,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  read_at timestamp with time zone
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_type_idx on public.notifications(type);
