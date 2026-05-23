alter table public.profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by uuid references public.profiles(id) on delete set null;

create table if not exists public.student_admin_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  note text not null check (length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.student_account_actions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('blocked', 'unblocked', 'note_added')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists student_admin_notes_student_id_idx on public.student_admin_notes(student_id);
create index if not exists student_admin_notes_created_at_idx on public.student_admin_notes(created_at desc);
create index if not exists student_account_actions_student_id_idx on public.student_account_actions(student_id);
create index if not exists student_account_actions_created_at_idx on public.student_account_actions(created_at desc);

alter table public.student_admin_notes enable row level security;
alter table public.student_account_actions enable row level security;

drop policy if exists "Admins can manage student notes" on public.student_admin_notes;
drop policy if exists "Admins can read student actions" on public.student_account_actions;

create policy "Admins can manage student notes"
  on public.student_admin_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can read student actions"
  on public.student_account_actions for select
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.student_admin_notes to authenticated;
grant select on public.student_account_actions to authenticated;
