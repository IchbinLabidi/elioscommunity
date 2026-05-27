create or replace function public.review_course_enrollment(
  target_enrollment_id uuid, new_status text, review_note text default null
) returns public.course_enrollments
language plpgsql security definer set search_path = public as $$
declare
  enrollment_row public.course_enrollments;
  previous_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_status not in ('approved', 'rejected') then raise exception 'Invalid enrollment status.'; end if;

  select status into previous_status from public.course_enrollments where id = target_enrollment_id;
  update public.course_enrollments set
    status = new_status,
    rejection_reason = case when new_status = 'rejected' then nullif(btrim(coalesce(review_note, '')), '') else null end,
    approved_at = case when new_status = 'approved' then now() else null end,
    approved_by = case when new_status = 'approved' then auth.uid() else null end,
    rejected_at = case when new_status = 'rejected' then now() else null end,
    rejected_by = case when new_status = 'rejected' then auth.uid() else null end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = target_enrollment_id and (
    public.is_admin() or exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and p.role::text = 'teacher' and p.id = course_enrollments.teacher_id
        and coalesce(p.is_blocked, false) = false
        and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked')
    )
  ) returning * into enrollment_row;

  if enrollment_row.id is null then raise exception 'Enrollment not found or you cannot review it.'; end if;
  insert into public.enrollment_actions(enrollment_id, admin_id, action, previous_status, new_status, reason)
  values (target_enrollment_id, auth.uid(), new_status, previous_status, new_status,
    case when new_status = 'rejected' then nullif(btrim(coalesce(review_note, '')), '') else null end);
  perform public.write_admin_audit('review_enrollment', 'course', enrollment_row.course_id,
    jsonb_build_object('status', new_status, 'enrollment_id', target_enrollment_id));
  return enrollment_row;
end;
$$;

grant execute on function public.review_course_enrollment(uuid, text, text) to authenticated;
