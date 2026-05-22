alter table public.ratings
  add column if not exists answer_id uuid references public.answers(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.ratings drop constraint if exists ratings_review_check;
alter table public.ratings drop constraint if exists ratings_review_length_check;
alter table public.ratings
  add constraint ratings_review_length_check
  check (review is null or char_length(review) <= 1000);

create unique index if not exists unique_student_teacher_question_rating
  on public.ratings(student_id, teacher_id, question_id);

create index if not exists ratings_student_id_idx on public.ratings(student_id);
create index if not exists ratings_teacher_id_idx on public.ratings(teacher_id);
create index if not exists ratings_question_id_idx on public.ratings(question_id);
create index if not exists ratings_answer_id_idx on public.ratings(answer_id);
create index if not exists ratings_rating_idx on public.ratings(rating);
create index if not exists ratings_created_at_idx on public.ratings(created_at desc);

drop trigger if exists ratings_touch_updated_at on public.ratings;
create trigger ratings_touch_updated_at
  before update on public.ratings
  for each row execute procedure public.touch_updated_at();
