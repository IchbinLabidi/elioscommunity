alter table public.profiles
  add column if not exists teacher_revenue_share_percent numeric not null default 50;

alter table public.profiles
  drop constraint if exists profiles_teacher_revenue_share_percent_check;

alter table public.profiles
  add constraint profiles_teacher_revenue_share_percent_check
  check (teacher_revenue_share_percent >= 0 and teacher_revenue_share_percent <= 100);

create or replace function public.prevent_profile_privilege_escalation()
returns trigger language plpgsql as $$
begin
  if public.is_admin() then return new; end if;
  if old.id is distinct from new.id
    or old.role is distinct from new.role
    or old.is_approved is distinct from new.is_approved
    or old.is_blocked is distinct from new.is_blocked
    or old.blocked_reason is distinct from new.blocked_reason
    or old.blocked_at is distinct from new.blocked_at
    or old.blocked_by is distinct from new.blocked_by
    or old.verification_status is distinct from new.verification_status
    or old.verified_at is distinct from new.verified_at
    or old.teacher_revenue_share_percent is distinct from new.teacher_revenue_share_percent then
    raise exception 'Only admins can change protected profile fields';
  end if;
  return new;
end;
$$;

create table if not exists public.teacher_earnings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrollment_id uuid unique references public.course_enrollments(id) on delete set null,
  payment_id uuid,
  gross_amount numeric not null check (gross_amount >= 0),
  teacher_share_percent numeric not null check (teacher_share_percent >= 0 and teacher_share_percent <= 100),
  teacher_amount numeric not null check (teacher_amount >= 0),
  platform_amount numeric not null check (platform_amount >= 0),
  currency text not null default 'TND',
  status text not null default 'earned'
    check (status in ('earned', 'pending', 'paid_out', 'refunded', 'cancelled')),
  earned_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index if not exists teacher_earnings_teacher_earned_idx
  on public.teacher_earnings(teacher_id, earned_at desc);

create index if not exists teacher_earnings_course_earned_idx
  on public.teacher_earnings(course_id, earned_at desc);

create index if not exists teacher_earnings_status_idx
  on public.teacher_earnings(status);

alter table public.teacher_earnings enable row level security;

drop policy if exists "Admins can read all teacher earnings" on public.teacher_earnings;
drop policy if exists "Teachers can read own earnings" on public.teacher_earnings;

create policy "Admins can read all teacher earnings"
  on public.teacher_earnings for select to authenticated
  using (public.is_admin());

create policy "Teachers can read own earnings"
  on public.teacher_earnings for select to authenticated
  using (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'teacher'
    )
  );

grant select on public.teacher_earnings to authenticated;

comment on column public.profiles.teacher_revenue_share_percent is
  'Negotiated teacher share used only for future approved course enrollments.';

comment on table public.teacher_earnings is
  'Immutable revenue snapshots created when paid course enrollments are approved.';
