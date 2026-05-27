create or replace function public.create_course_enrollment(
  target_course_id uuid,
  proof_url text,
  proof_path text,
  payment_note text default null
) returns public.course_enrollments
language plpgsql security definer set search_path = public as $$
declare
  course_row public.courses;
  enrollment_row public.course_enrollments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.is_current_user_blocked() then raise exception 'Your account has been restricted.'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student') then
    raise exception 'Only students can enroll in courses.';
  end if;

  select * into course_row from public.courses
  where id = target_course_id and is_published = true and coalesce(is_hidden, false) = false;
  if course_row.id is null then raise exception 'Course not found.'; end if;
  if coalesce(course_row.price, 0) <= 0 then raise exception 'Free courses do not need enrollment.'; end if;
  if exists (
    select 1 from public.course_enrollments e
    where e.course_id = target_course_id and e.student_id = auth.uid() and e.status = 'approved'
  ) then raise exception 'You are already enrolled in this course.'; end if;

  insert into public.course_enrollments(
    course_id, subject_id, student_id, teacher_id, status, payment_proof_url,
    payment_proof_path, payment_note, submitted_at
  ) values (
    course_row.id, course_row.subject_id, auth.uid(), course_row.teacher_id, 'pending',
    proof_url, proof_path, nullif(btrim(coalesce(payment_note, '')), ''), now()
  )
  on conflict (course_id, student_id) do update set
    subject_id = excluded.subject_id, status = 'pending',
    payment_proof_url = excluded.payment_proof_url, payment_proof_path = excluded.payment_proof_path,
    payment_note = excluded.payment_note, submitted_at = now(), rejection_reason = null,
    approved_at = null, approved_by = null, rejected_at = null, rejected_by = null,
    reviewed_by = null, reviewed_at = null
  where public.course_enrollments.status in ('pending', 'rejected', 'cancelled')
  returning * into enrollment_row;

  if enrollment_row.id is null then raise exception 'This enrollment cannot be changed.'; end if;
  insert into public.enrollment_actions(enrollment_id, action, previous_status, new_status, created_at)
  values (enrollment_row.id, 'submitted', null, 'pending', now());
  return enrollment_row;
end;
$$;

grant execute on function public.create_course_enrollment(uuid, text, text, text) to authenticated;
