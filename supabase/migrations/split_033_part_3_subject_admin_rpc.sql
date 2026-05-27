create or replace function public.admin_manage_subject(
  target_subject_id uuid,
  admin_action text,
  reason text default null
) returns public.subjects
language plpgsql security definer set search_path = public
as $$
declare
  previous_state jsonb;
  updated_subject public.subjects;
  linked_courses integer;
  linked_questions integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if admin_action not in ('publish','unpublish','hide','unhide','feature','unfeature','delete') then
    raise exception 'Unsupported subject admin action';
  end if;
  if admin_action = 'hide' and nullif(trim(reason), '') is null then
    raise exception 'A reason is required';
  end if;

  select to_jsonb(s) into previous_state from public.subjects s where s.id = target_subject_id;
  if previous_state is null then raise exception 'Subject not found'; end if;

  if admin_action = 'delete' then
    select count(*) into linked_courses from public.courses c
      where c.subject_id = target_subject_id
        or lower(trim(c.subject)) = lower(trim(previous_state->>'name'));
    select count(*) into linked_questions from public.questions q
      where q.subject_id = target_subject_id
        or lower(trim(q.subject)) = lower(trim(previous_state->>'name'));
    if linked_courses > 0 or linked_questions > 0 then
      raise exception 'Subject is used by courses or questions';
    end if;
    delete from public.subjects where id = target_subject_id returning * into updated_subject;
  elsif admin_action = 'publish' then
    update public.subjects set is_published=true, updated_by=auth.uid(), updated_at=now()
      where id=target_subject_id returning * into updated_subject;
  elsif admin_action = 'unpublish' then
    update public.subjects set is_published=false, updated_by=auth.uid(), updated_at=now()
      where id=target_subject_id returning * into updated_subject;
  elsif admin_action = 'hide' then
    update public.subjects set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
      hidden_by=auth.uid(), updated_by=auth.uid(), updated_at=now()
      where id=target_subject_id returning * into updated_subject;
  elsif admin_action = 'unhide' then
    update public.subjects set is_hidden=false, hidden_reason=null, hidden_at=null,
      hidden_by=null, updated_by=auth.uid(), updated_at=now()
      where id=target_subject_id returning * into updated_subject;
  elsif admin_action = 'feature' then
    update public.subjects set is_featured=true, updated_by=auth.uid(), updated_at=now()
      where id=target_subject_id returning * into updated_subject;
  else
    update public.subjects set is_featured=false, updated_by=auth.uid(), updated_at=now()
      where id=target_subject_id returning * into updated_subject;
  end if;

  perform public.write_admin_audit('subject_' || admin_action, 'subject', target_subject_id,
    jsonb_build_object('reason', reason, 'previous_state', previous_state, 'new_state', to_jsonb(updated_subject)));
  return updated_subject;
end;
$$;

grant execute on function public.admin_manage_subject(uuid, text, text) to authenticated;
