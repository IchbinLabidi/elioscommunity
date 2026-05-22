create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_best boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.answers
  add column if not exists is_best boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.questions
  add column if not exists best_answer_id uuid,
  alter column status set default 'open';

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.questions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.questions drop constraint if exists %I', constraint_name);
  end loop;
end;
$$;

alter table public.questions
  add constraint questions_status_check check (status in ('open', 'answered', 'closed'));

alter table public.questions
  drop constraint if exists questions_best_answer_id_fkey,
  add constraint questions_best_answer_id_fkey
  foreign key (best_answer_id) references public.answers(id) on delete set null;

create index if not exists answers_question_id_idx on public.answers(question_id);
create index if not exists answers_teacher_id_idx on public.answers(teacher_id);
create index if not exists answers_created_at_idx on public.answers(created_at);
create index if not exists questions_best_answer_id_idx on public.questions(best_answer_id);

drop trigger if exists answers_touch_updated_at on public.answers;
create trigger answers_touch_updated_at
  before update on public.answers
  for each row execute procedure public.touch_updated_at();
