create table if not exists public.answer_comments (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists answer_comments_answer_id_idx on public.answer_comments(answer_id);
create index if not exists answer_comments_question_id_idx on public.answer_comments(question_id);
create index if not exists answer_comments_user_id_idx on public.answer_comments(user_id);
create index if not exists answer_comments_created_at_idx on public.answer_comments(created_at);

drop trigger if exists answer_comments_touch_updated_at on public.answer_comments;
create trigger answer_comments_touch_updated_at
  before update on public.answer_comments
  for each row execute procedure public.touch_updated_at();
