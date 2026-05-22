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
    where q.id = target_question_id
      and q.student_id = auth.uid()
  ) then
    raise exception 'Only the student who asked this question can mark the best answer.';
  end if;

  if not exists (
    select 1 from public.answers a
    where a.id = target_answer_id
      and a.question_id = target_question_id
  ) then
    raise exception 'This answer does not belong to the selected question.';
  end if;

  perform set_config('app.marking_best_answer', 'true', true);

  update public.answers
  set is_best = false
  where question_id = target_question_id;

  update public.answers
  set is_best = true
  where id = target_answer_id;

  update public.questions
  set best_answer_id = target_answer_id,
      status = 'answered'
  where id = target_question_id
  returning * into updated_question;

  return updated_question;
end;
$$;

alter table public.answers enable row level security;

drop policy if exists "Authenticated users can view answers" on public.answers;
drop policy if exists "Active teachers can answer open questions" on public.answers;
drop policy if exists "Teachers can create their own answers" on public.answers;
drop policy if exists "Teachers can update their own answers" on public.answers;
drop policy if exists "Teachers can delete their own answers" on public.answers;
drop policy if exists "Admins can manage answers" on public.answers;

create policy "Authenticated users can view answers"
  on public.answers for select
  to authenticated
  using (true);

create policy "Teachers can create their own answers"
  on public.answers for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and q.status <> 'closed'
    )
  );

create policy "Teachers can update their own answers"
  on public.answers for update
  to authenticated
  using (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
  );

create policy "Teachers can delete their own answers"
  on public.answers for delete
  to authenticated
  using (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'teacher'
    )
  );

create policy "Admins can manage answers"
  on public.answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.answers to authenticated;
grant execute on function public.mark_best_answer(uuid, uuid) to authenticated;
