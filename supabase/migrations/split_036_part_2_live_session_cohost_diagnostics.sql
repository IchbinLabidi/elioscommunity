alter table public.course_live_sessions
  add column if not exists teacher_cohost_google_status_code integer,
  add column if not exists teacher_cohost_google_message text,
  add column if not exists teacher_cohost_missing_scopes boolean not null default false,
  add column if not exists teacher_cohost_preview_unsupported boolean not null default false;

comment on column public.course_live_sessions.teacher_cohost_google_status_code is
  'Safe HTTP status returned while resolving the Meet space or assigning the experimental co-host role.';

comment on column public.course_live_sessions.teacher_cohost_google_message is
  'Safe Google API diagnostic message; must not contain OAuth tokens or application secrets.';

comment on column public.course_live_sessions.teacher_cohost_missing_scopes is
  'True when the Meet API response indicates OAuth scopes must be added and the refresh token regenerated.';

comment on column public.course_live_sessions.teacher_cohost_preview_unsupported is
  'True when Meet co-host assignment appears unavailable due to Developer Preview or Workspace permissions.';
