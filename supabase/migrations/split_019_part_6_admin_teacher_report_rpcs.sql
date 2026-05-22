create or replace function public.admin_verify_teacher(target_teacher_id uuid)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare updated_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set is_verified = true, updated_at = now()
  where id = target_teacher_id and role::text = 'teacher' returning * into updated_profile;
  if updated_profile.id is null then raise exception 'Teacher not found'; end if;
  perform public.write_admin_audit('verify_teacher','user',target_teacher_id);
  return updated_profile;
end;
$$;

create or replace function public.admin_unverify_teacher(target_teacher_id uuid)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare updated_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set is_verified = false, updated_at = now()
  where id = target_teacher_id returning * into updated_profile;
  perform public.write_admin_audit('unverify_teacher','user',target_teacher_id);
  return updated_profile;
end;
$$;

create or replace function public.create_report(target_type text, target_id uuid, reason text, description text default null)
returns public.reports
language plpgsql security definer set search_path = public
as $$
declare created_report public.reports;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.is_current_user_blocked() then raise exception 'Your account has been restricted.'; end if;
  insert into public.reports(reporter_id,target_type,target_id,reason,description)
  values (auth.uid(), target_type, target_id, reason, description)
  returning * into created_report;
  return created_report;
end;
$$;

grant execute on function public.admin_verify_teacher(uuid) to authenticated;
grant execute on function public.admin_unverify_teacher(uuid) to authenticated;
grant execute on function public.create_report(text,uuid,text,text) to authenticated;
