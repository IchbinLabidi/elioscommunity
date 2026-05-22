with ranked_answers as (
  select
    id,
    row_number() over (
      partition by question_id, teacher_id
      order by is_best desc, created_at asc, id asc
    ) as answer_rank
  from public.answers
)
delete from public.answers a
using ranked_answers r
where a.id = r.id
  and r.answer_rank > 1;

create unique index if not exists unique_teacher_answer_per_question
  on public.answers(question_id, teacher_id);
