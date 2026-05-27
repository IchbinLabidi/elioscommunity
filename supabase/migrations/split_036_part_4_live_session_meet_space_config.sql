alter table public.course_live_sessions
  add column if not exists meet_space_config_status text not null default 'not_attempted',
  add column if not exists meet_space_config_error text,
  add column if not exists meet_artifact_config_status text not null default 'not_attempted',
  add column if not exists meet_artifact_config_error text,
  add column if not exists google_meet_config_payload jsonb;

alter table public.course_live_sessions
  drop constraint if exists course_live_sessions_meet_space_config_status_check,
  drop constraint if exists course_live_sessions_meet_artifact_config_status_check;

alter table public.course_live_sessions
  add constraint course_live_sessions_meet_space_config_status_check
  check (meet_space_config_status in ('not_attempted', 'configured', 'failed', 'unsupported')),
  add constraint course_live_sessions_meet_artifact_config_status_check
  check (meet_artifact_config_status in ('not_attempted', 'configured', 'failed', 'unsupported'));

comment on column public.course_live_sessions.meet_space_config_status is
  'Outcome of best-effort Google Meet space moderation (Host Management) configuration.';

comment on column public.course_live_sessions.meet_artifact_config_status is
  'Outcome of attempting to configure artifact sharing with co-hosts; unsupported when Google does not expose that Calendar setting in Meet API.';

comment on column public.course_live_sessions.google_meet_config_payload is
  'Safe Google Meet Space response for the most recent Host Management configuration attempt.';
