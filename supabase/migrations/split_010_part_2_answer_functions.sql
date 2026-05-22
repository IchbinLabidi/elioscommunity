create or replace function public.sync_question_after_best_answer_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_best then
    update public.questions
    set best_answer_id = null,
        status = case when status = 'answered' then 'open' else status end
    where id = old.question_id;
  end if;
  return old;
end;
$$;

drop trigger if exists answers_after_best_delete on public.answers;
create trigger answers_after_best_delete
  after delete on public.answers
  for each row execute procedure public.sync_question_after_best_answer_delete();

create or replace function public.guard_answer_best_flag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.is_best then
    raise exception 'Use mark_best_answer to select the best answer.';
  end if;

  if tg_op = 'UPDATE'
    and new.is_best is distinct from old.is_best
    and current_setting('app.marking_best_answer', true) is distinct from 'true'
  then
    raise exception 'Use mark_best_answer to change the best answer.';
  end if;

  return new;
end;
$$;

drop trigger if exists answers_guard_best_flag on public.answers;
create trigger answers_guard_best_flag
  before insert or update on public.answers
  for each row execute procedure public.guard_answer_best_flag();

create or replace function public.mark_best_answer(
  target_question_id uuid,
  target_answer_id uuid
)
returns public.questions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_question public.questions;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to mark a best answer.';
  end if;

  if not exists (
    select 1 from public.questions q
    where q.id = target_question_id and q.student_id = auth.uid()
  ) then
    raise exception 'Only the student who asked this question can mark the best answer.';
  end if;

  if not exists (
    select 1 from public.answers a
    where a.id = target_answer_id and a.question_id = target_question_id
  ) then
    raise exception 'This answer does not belong to the selected question.';
  end if;

  perform set_config('app.marking_best_answer', 'true', true);

  update public.answers set is_best = false where question_id = target_question_id;
  update public.answers set is_best = true where id = target_answer_id;

  update public.questions
  set best_answer_id = target_answer_id, status = 'answered'
  where id = target_question_id
  returning * into updated_question;

  return updated_question;
end;
$$;
