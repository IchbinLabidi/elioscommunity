create or replace function public.admin_delete_content(target_type text, target_id uuid, reason text default null)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_type = 'question' then delete from public.questions where id=target_id;
  elsif target_type = 'answer' then delete from public.answers where id=target_id;
  elsif target_type = 'answer_comment' then update public.answer_comments set deleted_at=now(), content='Comment deleted' where id=target_id;
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

create or replace function public.admin_update_report_status(target_report_id uuid, new_status text, admin_note_text text default null)
returns public.reports
language plpgsql security definer set search_path = public
as $$
declare
  updated_report public.reports;
  status_schema text;
  status_type text;
  status_is_enum boolean;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if new_status not in ('reviewed', 'resolved', 'rejected') then
    raise exception 'Invalid report status';
  end if;

  select udt_schema, udt_name into status_schema, status_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'reports'
    and column_name = 'status';

  select t.typtype = 'e' into status_is_enum
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = status_schema and t.typname = status_type;

  if status_is_enum then
    execute
      format('update public.reports set status=$1::%I.%I, admin_note=$2, reviewed_by=$3, reviewed_at=now() where id=$4 returning *', status_schema, status_type)
      using new_status, admin_note_text, auth.uid(), target_report_id
      into updated_report;
  else
    update public.reports set status=new_status, admin_note=admin_note_text, reviewed_by=auth.uid(), reviewed_at=now()
    where id=target_report_id returning * into updated_report;
  end if;

  perform public.write_admin_audit(new_status || '_report','report',target_report_id,jsonb_build_object('status',new_status,'note',admin_note_text));
  return updated_report;
end;
$$;

grant execute on function public.admin_delete_content(text,uuid,text) to authenticated;
grant execute on function public.admin_update_report_status(uuid,text,text) to authenticated;
