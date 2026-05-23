create or replace function public.can_manage_course_content(target_teacher_id uuid, target_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    auth.uid() = target_teacher_id
    and exists (select 1 from public.courses c where c.id = target_course_id
      and c.teacher_id = auth.uid() and coalesce(c.is_hidden, false) = false)
    and exists (select 1 from public.profiles p where p.id = auth.uid()
      and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false
      and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
  );
$$;

create or replace function public.can_manage_chapter_content(
  target_teacher_id uuid, target_course_id uuid, target_module_id uuid, target_chapter_id uuid
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    auth.uid() = target_teacher_id
    and exists (select 1 from public.course_chapters ch where ch.id = target_chapter_id
      and ch.course_id = target_course_id and ch.teacher_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid()
      and p.role::text = 'teacher' and coalesce(p.is_blocked, false) = false
      and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked'))
  );
$$;

create or replace function public.review_course_enrollment(
  target_enrollment_id uuid, new_status text, review_note text default null
) returns public.course_enrollments
language plpgsql security definer set search_path = public as $$
declare enrollment_row public.course_enrollments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_status not in ('approved', 'rejected') then raise exception 'Invalid enrollment status.'; end if;
  update public.course_enrollments set
    status = new_status,
    rejection_reason = case when new_status = 'rejected' then nullif(btrim(coalesce(review_note, '')), '') else null end,
    reviewed_by = auth.uid(), reviewed_at = now()
  where id = target_enrollment_id and (
    public.is_admin() or exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and p.role::text = 'teacher' and p.id = course_enrollments.teacher_id
        and coalesce(p.is_blocked, false) = false
        and coalesce(p.verification_status, 'pending') not in ('suspended', 'blocked')
    )
  ) returning * into enrollment_row;
  if enrollment_row.id is null then raise exception 'Enrollment not found or you cannot review it.'; end if;
  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'review_enrollment', 'course', enrollment_row.course_id,
    jsonb_build_object('status', new_status, 'enrollment_id', target_enrollment_id));
  return enrollment_row;
end;
$$;

grant execute on function public.can_manage_course_content(uuid, uuid) to authenticated;
grant execute on function public.can_manage_chapter_content(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.review_course_enrollment(uuid, text, text) to authenticated;
