alter table public.course_live_sessions
  add column if not exists teacher_cohost_attempted_method text,
  add column if not exists teacher_cohost_attempted_endpoint text;

comment on column public.course_live_sessions.teacher_cohost_attempted_method is
  'Safe HTTP method used for the last experimental Google Meet co-host assignment attempt.';

comment on column public.course_live_sessions.teacher_cohost_attempted_endpoint is
  'Safe Google Meet API endpoint used for the last co-host attempt; never stores authorization data.';
