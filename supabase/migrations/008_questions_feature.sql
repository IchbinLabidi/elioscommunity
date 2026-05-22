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

alter table public.questions enable row level security;

drop policy if exists "Authenticated users can view questions" on public.questions;
drop policy if exists "Students can create their own questions" on public.questions;
drop policy if exists "Students can update their own questions" on public.questions;
drop policy if exists "Students can delete their own open questions" on public.questions;
drop policy if exists "Admins can manage questions" on public.questions;

create policy "Authenticated users can view questions"
  on public.questions for select
  to authenticated
  using (true);

create policy "Students can create their own questions"
  on public.questions for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Students can update their own questions"
  on public.questions for update
  to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  )
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Students can delete their own open questions"
  on public.questions for delete
  to authenticated
  using (
    student_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

create policy "Admins can manage questions"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
