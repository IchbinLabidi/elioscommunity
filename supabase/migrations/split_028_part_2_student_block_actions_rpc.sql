create or replace function public.admin_block_student(target_student_id uuid, reason text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  updated_profile public.profiles;
  block_reason text := nullif(btrim(coalesce(reason, '')), '');
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if block_reason is null then raise exception 'A block reason is required.'; end if;

  update public.profiles
  set is_blocked = true,
      blocked_reason = block_reason,
      blocked_at = now(),
      blocked_by = auth.uid(),
      updated_at = now()
  where id = target_student_id and role::text = 'student'
  returning * into updated_profile;

  if updated_profile.id is null then raise exception 'Student not found.'; end if;

  insert into public.student_account_actions(student_id, admin_id, action, reason)
  values (target_student_id, auth.uid(), 'blocked', block_reason);
  perform public.write_admin_audit('block_student', 'user', target_student_id, jsonb_build_object('reason', block_reason));
  return updated_profile;
end;
$$;

create or replace function public.admin_unblock_student(target_student_id uuid)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare updated_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  update public.profiles
  set is_blocked = false,
      blocked_reason = null,
      blocked_at = null,
      blocked_by = null,
      updated_at = now()
  where id = target_student_id and role::text = 'student'
  returning * into updated_profile;

  if updated_profile.id is null then raise exception 'Student not found.'; end if;

  insert into public.student_account_actions(student_id, admin_id, action)
  values (target_student_id, auth.uid(), 'unblocked');
  perform public.write_admin_audit('unblock_student', 'user', target_student_id);
  return updated_profile;
end;
$$;

grant execute on function public.admin_block_student(uuid, text) to authenticated;
grant execute on function public.admin_unblock_student(uuid) to authenticated;
