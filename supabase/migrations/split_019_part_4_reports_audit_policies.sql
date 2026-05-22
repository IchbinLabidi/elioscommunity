create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role::text = 'admin'
  );
$$;

create or replace function public.is_current_user_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and coalesce(is_blocked, false) = true);
$$;

grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_current_user_blocked() to authenticated;

alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "Users can create reports" on public.reports;
drop policy if exists "Users can read own reports" on public.reports;
drop policy if exists "Admins can manage reports" on public.reports;
drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;

create policy "Users can create reports" on public.reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and public.is_current_user_blocked() = false
  and status = 'pending'
);

create policy "Users can read own reports" on public.reports for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin());

create policy "Admins can manage reports" on public.reports for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read audit logs" on public.admin_audit_logs for select
to authenticated
using (public.is_admin());

grant select, insert on public.reports to authenticated;
grant update, delete on public.reports to authenticated;
grant select, insert on public.admin_audit_logs to authenticated;
