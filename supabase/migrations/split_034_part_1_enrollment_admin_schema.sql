alter table public.course_enrollments
  add column if not exists payment_proof_type text,
  add column if not exists submitted_at timestamp with time zone,
  add column if not exists approved_at timestamp with time zone,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamp with time zone,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null;

update public.course_enrollments
set submitted_at = coalesce(submitted_at, created_at),
    approved_at = case when status = 'approved' then coalesce(approved_at, reviewed_at) else approved_at end,
    approved_by = case when status = 'approved' then coalesce(approved_by, reviewed_by) else approved_by end,
    rejected_at = case when status = 'rejected' then coalesce(rejected_at, reviewed_at) else rejected_at end,
    rejected_by = case when status = 'rejected' then coalesce(rejected_by, reviewed_by) else rejected_by end
where submitted_at is null
   or (status = 'approved' and approved_at is null)
   or (status = 'rejected' and rejected_at is null);

create table if not exists public.enrollment_actions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.course_enrollments(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in (
    'submitted', 'approved', 'rejected', 'reset_to_pending',
    'cancelled', 'access_removed', 'access_granted_manually', 'note_added'
  )),
  previous_status text,
  new_status text,
  reason text,
  note text,
  created_at timestamp with time zone default now()
);

create index if not exists enrollment_actions_enrollment_id_idx on public.enrollment_actions(enrollment_id);
create index if not exists enrollment_actions_created_at_idx on public.enrollment_actions(created_at desc);
create index if not exists course_enrollments_submitted_at_idx on public.course_enrollments(submitted_at desc);
