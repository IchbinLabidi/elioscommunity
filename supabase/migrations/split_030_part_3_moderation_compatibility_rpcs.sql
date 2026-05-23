create or replace function public.admin_hide_content(target_type text, target_id uuid, reason text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type in ('question','answer','answer_comment') then
    return public.admin_moderate_discussion_content(target_type, target_id, 'hide', reason);
  elsif target_type = 'rating' then update public.ratings set is_hidden=true, hidden_reason=reason, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'course' then update public.courses set is_hidden=true, hidden_reason=reason, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'module' then update public.course_modules set is_hidden=true, hidden_reason=reason, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'chapter' then update public.course_chapters set is_hidden=true, hidden_reason=reason, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'video' then update public.chapter_videos set is_hidden=true, hidden_reason=reason, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'attachment' then update public.chapter_attachments set is_hidden=true, hidden_reason=reason, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  else raise exception 'Unsupported target type';
  end if;
  perform public.write_admin_audit('hide_content',target_type,target_id,jsonb_build_object('reason',reason));
  return true;
end;
$$;

create or replace function public.admin_unhide_content(target_type text, target_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type in ('question','answer','answer_comment') then
    return public.admin_moderate_discussion_content(target_type, target_id, 'restore', null);
  elsif target_type = 'rating' then update public.ratings set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'course' then update public.courses set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'module' then update public.course_modules set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'chapter' then update public.course_chapters set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'video' then update public.chapter_videos set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'attachment' then update public.chapter_attachments set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  else raise exception 'Unsupported target type';
  end if;
  perform public.write_admin_audit('unhide_content',target_type,target_id);
  return true;
end;
$$;

grant execute on function public.admin_hide_content(text, uuid, text) to authenticated;
grant execute on function public.admin_unhide_content(text, uuid) to authenticated;
