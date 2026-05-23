create or replace function public.admin_moderate_course_content(
  target_type text,
  target_id uuid,
  admin_action text,
  reason text default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  previous_state jsonb;
  new_state jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type not in ('chapter', 'video', 'attachment') then raise exception 'Unsupported content type'; end if;
  if admin_action not in ('hide', 'unhide') then raise exception 'Unsupported content action'; end if;
  if admin_action = 'hide' and nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;

  if target_type = 'chapter' then
    select to_jsonb(ch) into previous_state from public.course_chapters ch where ch.id=target_id;
    if admin_action = 'hide' then
      update public.course_chapters set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
        hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    else
      update public.course_chapters set is_hidden=false, hidden_reason=null, hidden_at=null,
        hidden_by=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    end if;
    select to_jsonb(ch) into new_state from public.course_chapters ch where ch.id=target_id;
  elsif target_type = 'video' then
    select to_jsonb(v) into previous_state from public.chapter_videos v where v.id=target_id;
    if admin_action = 'hide' then
      update public.chapter_videos set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
        hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    else
      update public.chapter_videos set is_hidden=false, hidden_reason=null, hidden_at=null,
        hidden_by=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    end if;
    select to_jsonb(v) into new_state from public.chapter_videos v where v.id=target_id;
  else
    select to_jsonb(a) into previous_state from public.chapter_attachments a where a.id=target_id;
    if admin_action = 'hide' then
      update public.chapter_attachments set is_hidden=true, hidden_reason=trim(reason), hidden_at=now(),
        hidden_by=auth.uid(), moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    else
      update public.chapter_attachments set is_hidden=false, hidden_reason=null, hidden_at=null,
        hidden_by=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
    end if;
    select to_jsonb(a) into new_state from public.chapter_attachments a where a.id=target_id;
  end if;
  if previous_state is null then raise exception 'Content not found'; end if;
  perform public.write_admin_audit('course_content_' || admin_action, target_type, target_id,
    jsonb_build_object('reason', reason, 'previous_state', previous_state, 'new_state', new_state));
  return true;
end;
$$;

grant execute on function public.admin_moderate_course_content(text, uuid, text, text) to authenticated;
