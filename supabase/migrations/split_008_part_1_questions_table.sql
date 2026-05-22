create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  subject text not null,
  image_url text,
  status text not null default 'open',
  best_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions
  add column if not exists updated_at timestamptz not null default now();

alter table public.questions
  alter column status set default 'open';

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
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

create index if not exists questions_student_id_idx on public.questions(student_id);
create index if not exists questions_subject_idx on public.questions(subject);
create index if not exists questions_status_idx on public.questions(status);
create index if not exists questions_created_at_idx on public.questions(created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists questions_touch_updated_at on public.questions;

create trigger questions_touch_updated_at
  before update on public.questions
  for each row execute procedure public.touch_updated_at();
