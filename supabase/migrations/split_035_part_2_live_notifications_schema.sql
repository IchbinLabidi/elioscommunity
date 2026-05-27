create table if not exists public.live_session_notifications (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.course_live_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'scheduled', 'updated', 'cancelled', 'recording_available',
    'reminder_24h', 'reminder_1h', 'reminder_15m'
  )),
  sent_at timestamp with time zone not null default now(),
  unique(live_session_id, student_id, notification_type)
);

create index if not exists live_session_notifications_session_id_idx
  on public.live_session_notifications(live_session_id);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'question_answered', 'answer_replied', 'best_answer_selected',
  'teacher_followed', 'teacher_new_course', 'course_enrollment_submitted',
  'course_enrollment_approved', 'course_enrollment_rejected', 'video_comment',
  'rating_received', 'report_resolved', 'admin_message', 'live_session_scheduled',
  'live_session_updated', 'live_session_cancelled', 'live_session_recording_available',
  'live_session_reminder'
));
