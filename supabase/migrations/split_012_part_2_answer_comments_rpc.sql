create or replace function public.can_discuss_answer(target_answer_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.answers a
    join public.questions q on q.id = a.question_id
    join public.profiles p on p.id = auth.uid()
    where a.id = target_answer_id
      and (
        public.is_admin()
        or (p.role::text = 'student' and q.student_id = auth.uid())
        or (p.role::text = 'teacher' and a.teacher_id = auth.uid())
      )
  );
$$;

create or replace function public.create_answer_comment(target_answer_id uuid, comment_content text)
returns public.answer_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  answer_row public.answers;
  inserted_comment public.answer_comments;
  trimmed_content text := btrim(comment_content);
begin
  if auth.uid() is null then raise exception 'You must be logged in to reply.'; end if;
  if char_length(trimmed_content) < 1 or char_length(trimmed_content) > 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;

  select * into answer_row from public.answers where id = target_answer_id;
  if answer_row.id is null then raise exception 'Answer not found.'; end if;
  if not public.can_discuss_answer(target_answer_id) then
    raise exception 'You are not allowed to reply to this answer.';
  end if;

  insert into public.answer_comments (answer_id, question_id, user_id, content)
  values (answer_row.id, answer_row.question_id, auth.uid(), trimmed_content)
  returning * into inserted_comment;

  return inserted_comment;
end;
$$;
