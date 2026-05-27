create or replace function public.create_notification(
  target_user_id uuid,
  actor_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text default null,
  notification_target_type text default null,
  notification_target_id uuid default null,
  notification_target_url text default null
) returns public.notifications
language plpgsql security definer set search_path = public as $$
declare
  saved_notification public.notifications;
  stable_key text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if actor_user_id is not null and actor_user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Notification actor does not match current user.';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Notification target not found.';
  end if;
  if nullif(btrim(coalesce(notification_title, '')), '') is null then
    raise exception 'Notification title is required.';
  end if;
  if not public.can_create_notification_action(
    target_user_id, actor_user_id, notification_type, notification_target_id
  ) then
    raise exception 'Notification action is not allowed.';
  end if;

  if notification_type in (
    'teacher_new_course', 'course_published',
    'course_enrollment_submitted', 'enrollment_request',
    'course_enrollment_approved', 'enrollment_approved',
    'course_enrollment_rejected', 'enrollment_rejected'
  ) then
    stable_key := notification_type || ':' || notification_target_id || ':' || target_user_id;
  end if;

  insert into public.notifications (
    user_id, actor_id, type, title, message, target_type, target_id, target_url, dedupe_key
  ) values (
    target_user_id, actor_user_id, notification_type, btrim(notification_title),
    nullif(btrim(coalesce(notification_message, '')), ''),
    nullif(btrim(coalesce(notification_target_type, '')), ''), notification_target_id,
    nullif(btrim(coalesce(notification_target_url, '')), ''), stable_key
  )
  on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning * into saved_notification;
  return saved_notification;
end;
$$;

grant execute on function public.create_notification(uuid, uuid, text, text, text, text, uuid, text) to authenticated;
