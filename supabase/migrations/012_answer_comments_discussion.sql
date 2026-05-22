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

create or replace function public.can_discuss_answer(target_answer_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.answers a
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

create or replace function public.create_answer_comment(
  target_answer_id uuid,
  comment_content text
)
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
  if auth.uid() is null then
    raise exception 'You must be logged in to reply.';
  end if;

  if char_length(trimmed_content) < 1 or char_length(trimmed_content) > 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;

  select * into answer_row
  from public.answers
  where id = target_answer_id;

  if answer_row.id is null then
    raise exception 'Answer not found.';
  end if;

  if not public.can_discuss_answer(target_answer_id) then
    raise exception 'You are not allowed to reply to this answer.';
  end if;

  insert into public.answer_comments (answer_id, question_id, user_id, content)
  values (answer_row.id, answer_row.question_id, auth.uid(), trimmed_content)
  returning * into inserted_comment;

  return inserted_comment;
end;
$$;

create or replace function public.update_answer_comment(
  target_comment_id uuid,
  new_content text
)
returns public.answer_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_row public.answer_comments;
  updated_comment public.answer_comments;
  trimmed_content text := btrim(new_content);
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to edit a reply.';
  end if;

  if char_length(trimmed_content) < 1 or char_length(trimmed_content) > 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;

  select * into comment_row
  from public.answer_comments
  where id = target_comment_id;

  if comment_row.id is null or comment_row.deleted_at is not null then
    raise exception 'Comment not found.';
  end if;

  if comment_row.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'You can only edit your own comment.';
  end if;

  update public.answer_comments
  set content = trimmed_content,
      edited_at = now()
  where id = target_comment_id
  returning * into updated_comment;

  return updated_comment;
end;
$$;

create or replace function public.delete_answer_comment(target_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_row public.answer_comments;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to delete a reply.';
  end if;

  select * into comment_row
  from public.answer_comments
  where id = target_comment_id;

  if comment_row.id is null then
    raise exception 'Comment not found.';
  end if;

  if comment_row.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'You can only delete your own comment.';
  end if;

  update public.answer_comments
  set deleted_at = now()
  where id = target_comment_id;

  return true;
end;
$$;

alter table public.answer_comments enable row level security;

drop policy if exists "Participants can read answer comments" on public.answer_comments;
drop policy if exists "Participants can create answer comments" on public.answer_comments;
drop policy if exists "Owners can update answer comments" on public.answer_comments;
drop policy if exists "Owners can delete answer comments" on public.answer_comments;
drop policy if exists "Admins can manage answer comments" on public.answer_comments;

create policy "Participants can read answer comments"
  on public.answer_comments for select
  to authenticated
  using (true);

create policy "Admins can manage answer comments"
  on public.answer_comments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.answer_comments to authenticated;
grant execute on function public.create_answer_comment(uuid, text) to authenticated;
grant execute on function public.update_answer_comment(uuid, text) to authenticated;
grant execute on function public.delete_answer_comment(uuid) to authenticated;
