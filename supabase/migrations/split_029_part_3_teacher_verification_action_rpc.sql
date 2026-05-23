create or replace function public.admin_set_teacher_verification(
  target_teacher_id uuid,
  new_status text,
  reason text default null
) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  updated_profile public.profiles;
  previous_status text;
  clean_reason text := nullif(btrim(coalesce(reason, '')), '');
  action_name text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if new_status not in ('pending', 'verified', 'rejected', 'suspended', 'blocked') then
    raise exception 'Invalid teacher status.';
  end if;
  if new_status in ('rejected', 'suspended', 'blocked') and clean_reason is null then
    raise exception 'A reason is required for this action.';
  end if;

  select verification_status into previous_status from public.profiles
  where id = target_teacher_id and role::text = 'teacher';
  if previous_status is null then raise exception 'Teacher not found.'; end if;

  action_name := case
    when new_status = 'verified' then 'verified'
    when new_status = 'rejected' then 'rejected'
    when new_status = 'suspended' then 'suspended'
    when new_status = 'blocked' then 'blocked'
    when previous_status = 'suspended' then 'unsuspended'
    when previous_status = 'blocked' then 'unblocked'
    else 'verification_removed'
  end;

  update public.profiles set
    verification_status = new_status,
    is_verified = new_status = 'verified',
    verified_at = case when new_status = 'verified' then now() else null end,
    is_blocked = new_status = 'blocked',
    blocked_reason = null,
    blocked_at = case when new_status = 'blocked' then now() else null end,
    blocked_by = case when new_status = 'blocked' then auth.uid() else null end,
    updated_at = now()
  where id = target_teacher_id returning * into updated_profile;

  insert into public.teacher_verification_private(
    teacher_id, verified_by, verification_rejected_reason, suspended_at, suspended_by, suspension_reason, blocked_reason, updated_at
  ) values (
    target_teacher_id,
    case when new_status = 'verified' then auth.uid() else null end,
    case when new_status = 'rejected' then clean_reason else null end,
    case when new_status = 'suspended' then now() else null end,
    case when new_status = 'suspended' then auth.uid() else null end,
    case when new_status = 'suspended' then clean_reason else null end,
    case when new_status = 'blocked' then clean_reason else null end,
    now()
  ) on conflict (teacher_id) do update set
    verified_by = excluded.verified_by,
    verification_rejected_reason = excluded.verification_rejected_reason,
    suspended_at = excluded.suspended_at,
    suspended_by = excluded.suspended_by,
    suspension_reason = excluded.suspension_reason,
    blocked_reason = excluded.blocked_reason,
    updated_at = now();

  insert into public.teacher_verification_history(teacher_id, admin_id, action, previous_status, new_status, reason)
  values (target_teacher_id, auth.uid(), action_name, previous_status, new_status, clean_reason);
  perform public.write_admin_audit('teacher_' || action_name, 'user', target_teacher_id, jsonb_build_object('status', new_status, 'reason', clean_reason));
  return updated_profile;
end;
$$;

grant execute on function public.admin_set_teacher_verification(uuid, text, text) to authenticated;

create or replace function public.admin_verify_teacher(target_teacher_id uuid)
returns public.profiles language sql security definer set search_path = public as $$
  select public.admin_set_teacher_verification(target_teacher_id, 'verified', null);
$$;

create or replace function public.admin_unverify_teacher(target_teacher_id uuid)
returns public.profiles language sql security definer set search_path = public as $$
  select public.admin_set_teacher_verification(target_teacher_id, 'pending', null);
$$;

grant execute on function public.admin_verify_teacher(uuid) to authenticated;
grant execute on function public.admin_unverify_teacher(uuid) to authenticated;
