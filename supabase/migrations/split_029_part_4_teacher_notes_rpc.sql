create or replace function public.admin_add_teacher_note(target_teacher_id uuid, note_text text)
returns public.teacher_admin_notes
language plpgsql security definer set search_path = public as $$
declare
  created_note public.teacher_admin_notes;
  clean_note text := nullif(btrim(coalesce(note_text, '')), '');
  current_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if clean_note is null then raise exception 'Note cannot be empty.'; end if;
  if length(clean_note) > 4000 then raise exception 'Note is too long.'; end if;

  select verification_status into current_status from public.profiles
  where id = target_teacher_id and role::text = 'teacher';
  if current_status is null then raise exception 'Teacher not found.'; end if;

  insert into public.teacher_admin_notes(teacher_id, admin_id, note)
  values (target_teacher_id, auth.uid(), clean_note) returning * into created_note;
  insert into public.teacher_verification_history(teacher_id, admin_id, action, previous_status, new_status, reason)
  values (target_teacher_id, auth.uid(), 'note_added', current_status, current_status, left(clean_note, 160));
  perform public.write_admin_audit('teacher_note_added', 'user', target_teacher_id);
  return created_note;
end;
$$;

grant execute on function public.admin_add_teacher_note(uuid, text) to authenticated;
