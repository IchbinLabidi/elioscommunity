revoke execute on function public.review_course_enrollment(uuid, text, text) from authenticated;

create or replace function public.admin_manage_enrollment(
  target_enrollment_id uuid,
  admin_action text,
  reason text default null,
  note text default null
) returns public.course_enrollments
language plpgsql security definer set search_path = public as $$
declare
  enrollment_row public.course_enrollments;
  previous_status text;
  history_action text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if admin_action in ('approve', 'reject') then
    raise exception 'Use secure review-enrollment action for approval or rejection.';
  end if;
  if admin_action not in ('reset', 'cancel', 'grant', 'remove_access', 'note') then
    raise exception 'Unsupported enrollment action.';
  end if;
  if admin_action in ('cancel', 'remove_access') and nullif(btrim(coalesce(reason, '')), '') is null then
    raise exception 'A reason is required.';
  end if;

  select status into previous_status from public.course_enrollments where id = target_enrollment_id;
  if previous_status is null then raise exception 'Enrollment not found.'; end if;

  if admin_action = 'grant' then
    update public.course_enrollments set status='approved',
      approved_at=now(), approved_by=auth.uid(), rejected_at=null, rejected_by=null,
      rejection_reason=null, reviewed_at=now(), reviewed_by=auth.uid()
    where id=target_enrollment_id returning * into enrollment_row;
    history_action := 'access_granted_manually';
  elsif admin_action = 'reset' then
    update public.course_enrollments set status='pending',
      rejection_reason=null, rejected_at=null, rejected_by=null, approved_at=null, approved_by=null,
      reviewed_at=null, reviewed_by=null
    where id=target_enrollment_id returning * into enrollment_row;
    history_action := 'reset_to_pending';
  elsif admin_action in ('cancel', 'remove_access') then
    update public.course_enrollments set status='cancelled',
      rejection_reason=btrim(reason), reviewed_at=now(), reviewed_by=auth.uid()
    where id=target_enrollment_id returning * into enrollment_row;
    history_action := case when admin_action='remove_access' then 'access_removed' else 'cancelled' end;
  else
    select * into enrollment_row from public.course_enrollments where id=target_enrollment_id;
    history_action := 'note_added';
  end if;

  insert into public.enrollment_actions(enrollment_id, admin_id, action, previous_status, new_status, reason, note)
  values (target_enrollment_id, auth.uid(), history_action, previous_status, enrollment_row.status,
    nullif(btrim(reason), ''), nullif(btrim(note), ''));
  perform public.write_admin_audit('enrollment_' || history_action, 'course', enrollment_row.course_id,
    jsonb_build_object('enrollment_id', target_enrollment_id, 'reason', reason, 'note', note));
  return enrollment_row;
end;
$$;

grant execute on function public.admin_manage_enrollment(uuid, text, text, text) to authenticated;

comment on function public.admin_manage_enrollment(uuid, text, text, text) is
  'Admin actions excluding paid approval/rejection, which must use review-enrollment for unified authorization and earning capture.';
