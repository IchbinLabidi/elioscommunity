create or replace function public.list_teacher_ratings(target_teacher_id uuid)
returns table (
  id uuid,
  student_id uuid,
  teacher_id uuid,
  question_id uuid,
  answer_id uuid,
  rating integer,
  review text,
  created_at timestamptz,
  updated_at timestamptz,
  student_full_name text,
  student_avatar_url text,
  question_title text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.student_id, r.teacher_id, r.question_id, r.answer_id, r.rating, r.review,
         r.created_at, r.updated_at, p.full_name, p.avatar_url, q.title
  from public.ratings r
  join public.profiles p on p.id = r.student_id
  join public.questions q on q.id = r.question_id
  where r.teacher_id = target_teacher_id
  order by r.created_at desc;
$$;
