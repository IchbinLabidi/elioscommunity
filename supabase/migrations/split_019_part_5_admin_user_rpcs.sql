create or replace function public.write_admin_audit(target_action text, target_type text, target_id uuid, details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  values (auth.uid(), target_action, target_type, target_id, details);
end;
$$;

create or replace function public.admin_block_user(target_user_id uuid, reason text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare updated_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set is_blocked = true, blocked_reason = reason, updated_at = now()
  where id = target_user_id returning * into updated_profile;
  perform public.write_admin_audit('block_user','user',target_user_id,jsonb_build_object('reason',reason));
  return updated_profile;
end;
$$;

create or replace function public.admin_unblock_user(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare updated_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set is_blocked = false, blocked_reason = null, updated_at = now()
  where id = target_user_id returning * into updated_profile;
  perform public.write_admin_audit('unblock_user','user',target_user_id);
  return updated_profile;
end;
$$;

grant execute on function public.write_admin_audit(text,text,uuid,jsonb) to authenticated;
grant execute on function public.admin_block_user(uuid,text) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
