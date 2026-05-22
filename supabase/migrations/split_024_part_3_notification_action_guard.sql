create or replace function public.can_create_notification_action(
  target_user_id uuid,
  actor_user_id uuid,
  notification_type text,
  notification_target_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  valid_action boolean := false;
begin
  if notification_type = 'question_answered' then
    select exists (
      select 1 from public.answers a
      join public.questions q on q.id = a.question_id
      where a.id = notification_target_id
        and a.teacher_id = actor_user_id
        and q.student_id = target_user_id
    ) into valid_action;
  elsif notification_type = 'answer_replied' then
    select exists (
      select 1 from public.answer_comments ac
      join public.answers a on a.id = ac.answer_id
      join public.questions q on q.id = ac.question_id
      where ac.id = notification_target_id
        and ac.user_id = actor_user_id
        and target_user_id in (a.teacher_id, q.student_id)
        and target_user_id <> actor_user_id
    ) into valid_action;
  elsif notification_type = 'best_answer_selected' then
    select exists (
      select 1 from public.answers a
      join public.questions q on q.id = a.question_id
      where a.id = notification_target_id
        and q.student_id = actor_user_id
        and q.best_answer_id = a.id
        and a.teacher_id = target_user_id
    ) into valid_action;
  elsif notification_type = 'teacher_followed' then
    select exists (
      select 1 from public.teacher_follows tf
      where tf.student_id = actor_user_id
        and tf.teacher_id = target_user_id
        and notification_target_id = tf.teacher_id
    ) into valid_action;
  elsif notification_type = 'teacher_new_course' then
    select exists (
      select 1 from public.courses c
      join public.teacher_follows tf on tf.teacher_id = c.teacher_id
      where c.id = notification_target_id
        and c.teacher_id = actor_user_id
        and c.is_published = true
        and coalesce(c.is_hidden, false) = false
        and tf.student_id = target_user_id
    ) into valid_action;
  elsif notification_type = 'course_enrollment_submitted' then
    select exists (
      select 1 from public.course_enrollments e
      where e.id = notification_target_id
        and e.student_id = actor_user_id
        and e.teacher_id = target_user_id
    ) into valid_action;
  elsif notification_type in ('course_enrollment_approved', 'course_enrollment_rejected') then
    select exists (
      select 1 from public.course_enrollments e
      where e.id = notification_target_id
        and e.student_id = target_user_id
        and (e.teacher_id = actor_user_id or public.is_admin())
        and e.status = case when notification_type = 'course_enrollment_approved' then 'approved' else 'rejected' end
    ) into valid_action;
  elsif notification_type = 'rating_received' then
    select exists (
      select 1 from public.ratings r
      where r.id = notification_target_id
        and r.student_id = actor_user_id
        and r.teacher_id = target_user_id
    ) into valid_action;
  elsif notification_type in ('report_resolved', 'admin_message') then
    valid_action := public.is_admin();
  end if;
  return valid_action;
end;
$$;
