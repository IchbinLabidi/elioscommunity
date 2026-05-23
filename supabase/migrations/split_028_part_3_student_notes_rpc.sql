create or replace function public.admin_add_student_note(target_student_id uuid, note_text text)
returns public.student_admin_notes
language plpgsql security definer set search_path = public as $$
declare
  created_note public.student_admin_notes;
  clean_note text := nullif(btrim(coalesce(note_text, '')), '');
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if clean_note is null then raise exception 'Note cannot be empty.'; end if;
  if length(clean_note) > 4000 then raise exception 'Note is too long.'; end if;
  if not exists (
    select 1 from public.profiles
    where id = target_student_id and role::text = 'student'
  ) then
    raise exception 'Student not found.';
  end if;

  insert into public.student_admin_notes(student_id, admin_id, note)
  values (target_student_id, auth.uid(), clean_note)
  returning * into created_note;

  insert into public.student_account_actions(student_id, admin_id, action, reason)
  values (target_student_id, auth.uid(), 'note_added', left(clean_note, 160));
  perform public.write_admin_audit('student_note_added', 'user', target_student_id);
  return created_note;
end;
$$;

grant execute on function public.admin_add_student_note(uuid, text) to authenticated;
