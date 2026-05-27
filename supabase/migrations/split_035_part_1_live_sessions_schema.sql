create table if not exists public.course_live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  timezone text not null default 'Africa/Tunis',
  provider text not null default 'google_meet' check (provider = 'google_meet'),
  meeting_url text,
  google_event_id text,
  google_calendar_id text,
  google_conference_id text,
  google_html_link text,
  google_payload jsonb,
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','cancelled')),
  is_cancelled boolean not null default false,
  cancelled_reason text,
  cancelled_at timestamp with time zone,
  recording_url text,
  replay_available boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check (ends_at > starts_at)
);

create index if not exists course_live_sessions_course_id_idx on public.course_live_sessions(course_id);
create index if not exists course_live_sessions_teacher_id_idx on public.course_live_sessions(teacher_id);
create index if not exists course_live_sessions_starts_at_idx on public.course_live_sessions(starts_at);

drop trigger if exists course_live_sessions_touch_updated_at on public.course_live_sessions;
create trigger course_live_sessions_touch_updated_at before update on public.course_live_sessions
for each row execute procedure public.touch_updated_at();
