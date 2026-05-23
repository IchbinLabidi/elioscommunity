create or replace function public.admin_manage_course(
  target_course_id uuid,
  admin_action text,
  reason text default null
) returns public.courses
language plpgsql security definer set search_path = public
as $$
declare
  previous_state jsonb;
  updated_course public.courses;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if admin_action not in (
    'publish', 'unpublish', 'hide', 'unhide', 'feature', 'unfeature',
    'approve', 'request_changes', 'reject', 'delete', 'restore'
  ) then raise exception 'Unsupported course admin action'; end if;
  if admin_action in ('unpublish', 'hide', 'request_changes', 'reject', 'delete')
    and nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;

  select to_jsonb(c) into previous_state from public.courses c where c.id = target_course_id;
  if previous_state is null then raise exception 'Course not found'; end if;

  if admin_action = 'publish' then
    update public.courses set is_published=true, updated_at=now() where id=target_course_id;
  elsif admin_action = 'unpublish' then
    update public.courses set is_published=false, admin_review_note=trim(reason),
      reviewed_at=now(), reviewed_by=auth.uid(), updated_at=now() where id=target_course_id;
  elsif admin_action = 'hide' then
    update public.courses set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
      hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now(), updated_at=now()
      where id=target_course_id;
  elsif admin_action = 'unhide' then
    update public.courses set is_hidden=false, hidden_reason=null, hidden_at=null, hidden_by=null,
      moderated_by=auth.uid(), moderated_at=now(), updated_at=now() where id=target_course_id;
  elsif admin_action = 'feature' then
    update public.courses set is_featured=true, featured_at=now(), featured_by=auth.uid(), updated_at=now()
      where id=target_course_id;
  elsif admin_action = 'unfeature' then
    update public.courses set is_featured=false, featured_at=null, featured_by=null, updated_at=now()
      where id=target_course_id;
  elsif admin_action = 'approve' then
    update public.courses set admin_review_status='approved', admin_review_note=nullif(trim(reason), ''),
      reviewed_at=now(), reviewed_by=auth.uid(), updated_at=now() where id=target_course_id;
  elsif admin_action = 'request_changes' then
    update public.courses set admin_review_status='needs_changes', admin_review_note=trim(reason),
      reviewed_at=now(), reviewed_by=auth.uid(), updated_at=now() where id=target_course_id;
  elsif admin_action = 'reject' then
    update public.courses set admin_review_status='rejected', admin_review_note=trim(reason),
      is_published=false, reviewed_at=now(), reviewed_by=auth.uid(), updated_at=now() where id=target_course_id;
  elsif admin_action = 'delete' then
    update public.courses set is_deleted=true, is_hidden=true, is_published=false,
      deleted_reason=trim(reason), deleted_at=now(), deleted_by=auth.uid(), updated_at=now()
      where id=target_course_id;
  else
    update public.courses set is_deleted=false, deleted_reason=null, deleted_at=null, deleted_by=null,
      is_hidden=false, hidden_reason=null, hidden_at=null, hidden_by=null, updated_at=now()
      where id=target_course_id;
  end if;

  select * into updated_course from public.courses where id=target_course_id;
  perform public.write_admin_audit('course_' || admin_action, 'course', target_course_id,
    jsonb_build_object('reason', reason, 'previous_state', previous_state, 'new_state', to_jsonb(updated_course)));
  return updated_course;
end;
$$;

grant execute on function public.admin_manage_course(uuid, text, text) to authenticated;
