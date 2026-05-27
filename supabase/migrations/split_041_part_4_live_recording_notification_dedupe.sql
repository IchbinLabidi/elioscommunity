create or replace function public.notify_live_session_recording()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.replay_available = true
    and new.recording_url is not null
    and (old.replay_available is distinct from true or old.recording_url is distinct from new.recording_url) then
    insert into public.notifications(
      user_id, actor_id, type, title, message, target_type, target_id, target_url,
      data, dedupe_key
    )
    select e.student_id, auth.uid(), 'live_session_recording_added',
      'Enregistrement disponible',
      'L''enregistrement d''une session live est maintenant disponible.',
      'course_live_session', new.id, '/courses/' || new.course_id || '/learn',
      jsonb_build_object('courseId', new.course_id, 'sessionId', new.id),
      'live_session_recording_added:' || new.id || ':' || e.student_id
    from public.course_enrollments e
    where e.course_id = new.course_id and e.status = 'approved'
    on conflict (dedupe_key) do nothing;

    insert into public.live_session_notifications(live_session_id, student_id, notification_type)
    select new.id, e.student_id, 'recording_available'
    from public.course_enrollments e
    where e.course_id = new.course_id and e.status = 'approved'
    on conflict (live_session_id, student_id, notification_type) do nothing;
  end if;
  return new;
end;
$$;
