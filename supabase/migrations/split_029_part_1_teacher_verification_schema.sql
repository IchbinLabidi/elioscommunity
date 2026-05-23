alter table public.profiles
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'suspended', 'blocked')),
  add column if not exists verified_at timestamptz,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by uuid references public.profiles(id) on delete set null;

update public.profiles
set verification_status = case
  when coalesce(is_blocked, false) then 'blocked'
  when coalesce(is_verified, false) then 'verified'
  else verification_status
end
where role::text = 'teacher';

create table if not exists public.teacher_verification_private (
  teacher_id uuid primary key references public.profiles(id) on delete cascade,
  verified_by uuid references public.profiles(id) on delete set null,
  verification_rejected_reason text,
  suspended_at timestamptz,
  suspended_by uuid references public.profiles(id) on delete set null,
  suspension_reason text,
  blocked_reason text,
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_verification_history (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('verified', 'rejected', 'suspended', 'unsuspended', 'blocked', 'unblocked', 'verification_removed', 'note_added')),
  previous_status text,
  new_status text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_admin_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  note text not null check (length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists profiles_verification_status_idx on public.profiles(verification_status);
create index if not exists teacher_verification_history_teacher_id_idx on public.teacher_verification_history(teacher_id);
create index if not exists teacher_verification_history_created_at_idx on public.teacher_verification_history(created_at desc);
create index if not exists teacher_admin_notes_teacher_id_idx on public.teacher_admin_notes(teacher_id);
create index if not exists teacher_admin_notes_created_at_idx on public.teacher_admin_notes(created_at desc);
