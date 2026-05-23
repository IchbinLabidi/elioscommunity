create or replace function public.admin_delete_content(target_type text, target_id uuid, reason text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type in ('question','answer','answer_comment') then
    return public.admin_moderate_discussion_content(target_type, target_id, 'delete', reason);
  elsif target_type = 'rating' then delete from public.ratings where id=target_id;
  elsif target_type = 'course' then delete from public.courses where id=target_id;
  elsif target_type = 'module' then delete from public.course_modules where id=target_id;
  elsif target_type = 'chapter' then delete from public.course_chapters where id=target_id;
  elsif target_type = 'video' then delete from public.chapter_videos where id=target_id;
  elsif target_type = 'attachment' then delete from public.chapter_attachments where id=target_id;
  else raise exception 'Unsupported target type';
  end if;
  perform public.write_admin_audit('delete_content',target_type,target_id,jsonb_build_object('reason',reason));
  return true;
end;
$$;

grant execute on function public.admin_delete_content(text, uuid, text) to authenticated;
