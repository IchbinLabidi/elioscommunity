create or replace function public.admin_update_platform_setting(setting_key text, setting_value jsonb)
returns public.platform_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_setting public.platform_settings;
  updated_setting public.platform_settings;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if setting_value is null or jsonb_typeof(setting_value) <> 'object' then
    raise exception 'Setting value must be a JSON object';
  end if;

  select * into previous_setting from public.platform_settings where key = setting_key;
  if previous_setting.id is null then raise exception 'Unknown platform setting key'; end if;

  update public.platform_settings
  set value = setting_value, updated_by = auth.uid(), updated_at = now()
  where key = setting_key
  returning * into updated_setting;

  perform public.write_admin_audit(
    'update_platform_setting',
    'platform_setting',
    updated_setting.id,
    jsonb_build_object('key', setting_key, 'previousValue', previous_setting.value, 'newValue', setting_value)
  );
  return updated_setting;
end;
$$;

grant execute on function public.admin_update_platform_setting(text, jsonb) to authenticated;
