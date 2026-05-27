alter table public.profiles
  add column if not exists meet_email text;

alter table public.course_live_sessions
  add column if not exists google_meet_space_name text,
  add column if not exists google_meet_conference_record text,
  add column if not exists teacher_cohost_email text,
  add column if not exists teacher_cohost_status text not null default 'not_attempted',
  add column if not exists teacher_cohost_error text,
  add column if not exists teacher_cohost_assigned_at timestamp with time zone;

alter table public.course_live_sessions
  drop constraint if exists course_live_sessions_teacher_cohost_status_check;

alter table public.course_live_sessions
  add constraint course_live_sessions_teacher_cohost_status_check
  check (teacher_cohost_status in ('not_attempted', 'assigned', 'failed', 'unsupported'));

comment on column public.profiles.meet_email is
  'Optional Google account email used for Meet attendee and experimental co-host assignment.';

comment on column public.course_live_sessions.teacher_cohost_status is
  'Best-effort Google Meet v2beta co-host assignment result; does not control access to the session.';
