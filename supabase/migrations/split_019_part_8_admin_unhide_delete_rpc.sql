create or replace function public.admin_unhide_content(target_type text, target_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type = 'question' then update public.questions set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'answer' then update public.answers set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
  elsif target_type = 'answer_comment' then update public.answer_comments set is_hidden=false, hidden_reason=null, moderated_by=auth.uid(), moderated_at=now() where id=target_id;
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

grant execute on function public.admin_unhide_content(text,uuid) to authenticated;
