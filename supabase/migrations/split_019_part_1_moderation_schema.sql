alter table public.profiles
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_reason text;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('question','answer','answer_comment','rating','course','module','chapter','video','attachment','user')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','reviewed','resolved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists reports_touch_updated_at on public.reports;
create trigger reports_touch_updated_at before update on public.reports
for each row execute procedure public.touch_updated_at();

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_target_type_idx on public.reports(target_type);
create index if not exists reports_created_at_idx on public.reports(created_at);
create index if not exists admin_audit_logs_admin_id_idx on public.admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs(action);
create index if not exists admin_audit_logs_target_type_idx on public.admin_audit_logs(target_type);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_is_blocked_idx on public.profiles(is_blocked);
create index if not exists profiles_is_verified_idx on public.profiles(is_verified);
