alter table public.teacher_verification_private enable row level security;
alter table public.teacher_verification_history enable row level security;
alter table public.teacher_admin_notes enable row level security;

drop policy if exists "Admins can manage teacher verification details" on public.teacher_verification_private;
drop policy if exists "Teachers can read own verification details" on public.teacher_verification_private;
drop policy if exists "Admins can read teacher verification history" on public.teacher_verification_history;
drop policy if exists "Admins can manage teacher notes" on public.teacher_admin_notes;

create policy "Admins can manage teacher verification details"
  on public.teacher_verification_private for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Teachers can read own verification details"
  on public.teacher_verification_private for select to authenticated
  using (teacher_id = auth.uid());

create policy "Admins can read teacher verification history"
  on public.teacher_verification_history for select to authenticated
  using (public.is_admin());

create policy "Admins can manage teacher notes"
  on public.teacher_admin_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.teacher_verification_private to authenticated;
grant select, insert on public.teacher_verification_history to authenticated;
grant select, insert, update, delete on public.teacher_admin_notes to authenticated;

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
    or old.verified_at is distinct from new.verified_at then
    raise exception 'Only admins can change protected profile fields';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_profile_privilege_escalation();
