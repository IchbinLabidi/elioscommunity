create or replace function public.admin_moderate_discussion_content(
  target_type text,
  target_id uuid,
  moderation_action text,
  reason text default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  previous_state jsonb;
  new_state jsonb;
  related_question_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type not in ('question', 'answer', 'answer_comment') then
    raise exception 'Unsupported discussion target type';
  end if;
  if moderation_action not in ('hide', 'restore', 'delete', 'mark_reviewed') then
    raise exception 'Unsupported moderation action';
  end if;
  if moderation_action in ('hide', 'delete') and nullif(trim(reason), '') is null then
    raise exception 'A moderation reason is required';
  end if;

  if target_type = 'question' then
    select to_jsonb(q) into previous_state from public.questions q where q.id = target_id;
    if moderation_action = 'hide' then
      update public.questions set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
        hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    elsif moderation_action = 'restore' then
      update public.questions set is_hidden=false, hidden_reason=null, hidden_at=null, hidden_by=null,
        is_deleted=false, deleted_at=null, deleted_by=null, deleted_reason=null,
        moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    elsif moderation_action = 'delete' then
      update public.questions set is_hidden=true, is_deleted=true, deleted_reason=trim(reason),
        deleted_at=now(), deleted_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    else
      update public.questions set reviewed_at=now(), reviewed_by=auth.uid(),
        moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    end if;
    select to_jsonb(q) into new_state from public.questions q where q.id = target_id;
  elsif target_type = 'answer' then
    select to_jsonb(a), a.question_id into previous_state, related_question_id
    from public.answers a where a.id = target_id;
    if moderation_action = 'hide' then
      update public.answers set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
        hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    elsif moderation_action = 'restore' then
      update public.answers set is_hidden=false, hidden_reason=null, hidden_at=null, hidden_by=null,
        is_deleted=false, deleted_at=null, deleted_by=null, deleted_reason=null,
        moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    elsif moderation_action = 'delete' then
      update public.answers set is_hidden=true, is_deleted=true, deleted_reason=trim(reason),
        deleted_at=now(), deleted_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    else
      update public.answers set reviewed_at=now(), reviewed_by=auth.uid(),
        moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    end if;
    if moderation_action in ('hide', 'delete', 'restore') then
      update public.questions q set
        best_answer_id = case when q.best_answer_id = target_id then null else q.best_answer_id end,
        status = case when q.status = 'closed' then q.status when exists (
          select 1 from public.answers a where a.question_id = q.id
            and coalesce(a.is_hidden, false) = false and coalesce(a.is_deleted, false) = false
        ) then 'answered'::public.question_status else 'open'::public.question_status end
      where q.id = related_question_id;
    end if;
    select to_jsonb(a) into new_state from public.answers a where a.id = target_id;
  else
    select to_jsonb(c) into previous_state from public.answer_comments c where c.id = target_id;
    if moderation_action = 'hide' then
      update public.answer_comments set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
        hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    elsif moderation_action = 'restore' then
      update public.answer_comments set is_hidden=false, hidden_reason=null, hidden_at=null, hidden_by=null,
        is_deleted=false, deleted_at=null, deleted_by=null, deleted_reason=null,
        moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    elsif moderation_action = 'delete' then
      update public.answer_comments set is_hidden=true, is_deleted=true, deleted_reason=trim(reason),
        deleted_at=now(), deleted_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    else
      update public.answer_comments set reviewed_at=now(), reviewed_by=auth.uid(),
        moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    end if;
    select to_jsonb(c) into new_state from public.answer_comments c where c.id = target_id;
  end if;

  if previous_state is null then raise exception 'Content not found'; end if;
  perform public.write_admin_audit('moderation_' || moderation_action, target_type, target_id,
    jsonb_build_object('reason', reason, 'previous_state', previous_state, 'new_state', new_state));
  return true;
end;
$$;

grant execute on function public.admin_moderate_discussion_content(text, uuid, text, text) to authenticated;
