create table if not exists public.live_session_recurrence_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  recurrence_type text not null check (recurrence_type in (
    'daily', 'weekly', 'multiple_weekdays', 'custom'
  )),
  timezone text not null default 'Africa/Tunis',
  total_occurrences integer not null check (total_occurrences between 1 and 30),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

alter table public.course_live_sessions
  add column if not exists recurrence_group_id uuid
    references public.live_session_recurrence_groups(id) on delete set null,
  add column if not exists recurrence_index integer,
  add column if not exists recurrence_type text,
  add column if not exists recurrence_total_occurrences integer,
  add column if not exists is_recurring boolean not null default false;

create index if not exists live_sessions_recurrence_group_id_idx
  on public.course_live_sessions(recurrence_group_id);

alter table public.live_session_recurrence_groups enable row level security;
drop policy if exists "Visible live recurrence groups" on public.live_session_recurrence_groups;
create policy "Visible live recurrence groups"
on public.live_session_recurrence_groups for select to authenticated using (
  public.is_admin() or teacher_id = auth.uid() or exists (
    select 1 from public.course_enrollments e
    where e.course_id = live_session_recurrence_groups.course_id
      and e.student_id = auth.uid() and e.status = 'approved'
  )
);
