create or replace function public.admin_update_teacher_revenue_share(
  target_teacher_id uuid,
  new_percent numeric,
  admin_note text default null
) returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher_row public.profiles;
  previous_percent numeric;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if new_percent is null or new_percent < 0 or new_percent > 100 then
    raise exception 'Pourcentage invalide.';
  end if;

  select teacher_revenue_share_percent into previous_percent
  from public.profiles
  where id = target_teacher_id and role::text = 'teacher';
  if not found then raise exception 'Prof introuvable.'; end if;

  update public.profiles
  set teacher_revenue_share_percent = round(new_percent, 2), updated_at = now()
  where id = target_teacher_id and role::text = 'teacher'
  returning * into teacher_row;

  perform public.write_admin_audit(
    'update_teacher_revenue_share',
    'user',
    target_teacher_id,
    jsonb_build_object(
      'previous_percent', previous_percent,
      'new_percent', round(new_percent, 2),
      'note', nullif(btrim(coalesce(admin_note, '')), '')
    )
  );

  return teacher_row;
end;
$$;

grant execute on function public.admin_update_teacher_revenue_share(uuid, numeric, text) to authenticated;

comment on function public.admin_update_teacher_revenue_share(uuid, numeric, text) is
  'Admin-only adjustment applied to future earning snapshots; historical rows are unchanged.';
