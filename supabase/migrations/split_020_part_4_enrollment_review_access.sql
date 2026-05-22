create or replace function public.review_course_enrollment(
  target_enrollment_id uuid,
  new_status text,
  review_note text default null
) returns public.course_enrollments
language plpgsql security definer set search_path = public as $$
declare
  enrollment_row public.course_enrollments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_status not in ('approved','rejected') then raise exception 'Invalid enrollment status.'; end if;

  update public.course_enrollments
  set status = new_status,
      rejection_reason = case when new_status = 'rejected' then nullif(btrim(coalesce(review_note, '')), '') else null end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = target_enrollment_id
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role::text = 'teacher'
          and coalesce(p.is_blocked, false) = false
          and p.id = course_enrollments.teacher_id
      )
    )
  returning * into enrollment_row;

  if enrollment_row.id is null then raise exception 'Enrollment not found or you cannot review it.'; end if;
  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'review_enrollment',
    'course',
    enrollment_row.course_id,
    jsonb_build_object('status',new_status,'enrollment_id',target_enrollment_id)
  );
  return enrollment_row;
end;
$$;

create or replace function public.has_course_access(target_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses c where c.id = target_course_id and coalesce(c.price, 0) <= 0)
    or public.is_admin()
    or exists (select 1 from public.courses c where c.id = target_course_id and c.teacher_id = auth.uid())
    or exists (
      select 1 from public.course_enrollments e
      where e.course_id = target_course_id
        and e.student_id = auth.uid()
        and e.status = 'approved'
    );
$$;

grant execute on function public.review_course_enrollment(uuid, text, text) to authenticated;
grant execute on function public.has_course_access(uuid) to authenticated, anon;
