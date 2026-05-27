alter table public.course_live_sessions
  add column if not exists postponed_at timestamp with time zone,
  add column if not exists postponed_by uuid references public.profiles(id) on delete set null,
  add column if not exists previous_starts_at timestamp with time zone,
  add column if not exists previous_ends_at timestamp with time zone,
  add column if not exists postpone_reason text,
  add column if not exists postpone_count integer not null default 0;

create table if not exists public.live_session_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_live_sessions(id) on delete cascade,
  action text not null check (action in ('postponed')),
  actor_id uuid references public.profiles(id) on delete set null,
  old_starts_at timestamp with time zone,
  old_ends_at timestamp with time zone,
  new_starts_at timestamp with time zone,
  new_ends_at timestamp with time zone,
  reason text,
  created_at timestamp with time zone not null default now()
);

create index if not exists live_session_history_session_created_idx
  on public.live_session_history(session_id, created_at desc);

alter table public.live_session_history enable row level security;

drop policy if exists "Admins and owning teachers can read live session history" on public.live_session_history;
create policy "Admins and owning teachers can read live session history"
on public.live_session_history for select to authenticated using (
  public.is_admin()
  or exists (
    select 1 from public.course_live_sessions s
    where s.id = live_session_history.session_id
      and s.teacher_id = auth.uid()
  )
);

grant select on public.live_session_history to authenticated;

comment on column public.course_live_sessions.postpone_count is
  'Number of official date/time postponements performed by a teacher or administrator.';

comment on table public.live_session_history is
  'Audit trail for official live session date/time postponements.';
