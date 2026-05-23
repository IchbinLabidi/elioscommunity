drop policy if exists "Authenticated users can view questions" on public.questions;
drop policy if exists "Public can read visible questions" on public.questions;
create policy "Public can read visible questions" on public.questions for select to anon, authenticated
using (public.is_admin() or (coalesce(is_hidden, false) = false and coalesce(is_deleted, false) = false));

drop policy if exists "Authenticated users can view answers" on public.answers;
drop policy if exists "Public can read visible answers" on public.answers;
create policy "Public can read visible answers" on public.answers for select to anon, authenticated
using (public.is_admin() or (
  coalesce(is_hidden, false) = false and coalesce(is_deleted, false) = false
  and exists (
    select 1 from public.questions q where q.id = answers.question_id
      and coalesce(q.is_hidden, false) = false and coalesce(q.is_deleted, false) = false
  )
));

drop policy if exists "Participants can read answer comments" on public.answer_comments;
drop policy if exists "Public can read visible answer comments" on public.answer_comments;
create policy "Public can read visible answer comments" on public.answer_comments for select to anon, authenticated
using (public.is_admin() or (
  coalesce(is_hidden, false) = false and coalesce(is_deleted, false) = false
  and exists (
    select 1 from public.answers a join public.questions q on q.id = a.question_id
    where a.id = answer_comments.answer_id and q.id = answer_comments.question_id
      and coalesce(a.is_hidden, false) = false and coalesce(a.is_deleted, false) = false
      and coalesce(q.is_hidden, false) = false and coalesce(q.is_deleted, false) = false
  )
));

create or replace function public.list_answer_comments(target_answer_id uuid)
returns table (
  id uuid, answer_id uuid, question_id uuid, user_id uuid, content text,
  created_at timestamptz, updated_at timestamptz, edited_at timestamptz,
  deleted_at timestamptz, profile_full_name text, profile_avatar_url text, profile_role text
) language sql security definer set search_path = public as $$
  select c.id, c.answer_id, c.question_id, c.user_id, c.content, c.created_at,
    c.updated_at, c.edited_at, c.deleted_at, p.full_name, p.avatar_url, p.role::text
  from public.answer_comments c
  join public.profiles p on p.id = c.user_id
  join public.answers a on a.id = c.answer_id
  join public.questions q on q.id = c.question_id
  where c.answer_id = target_answer_id and (public.is_admin() or (
    coalesce(c.is_hidden, false) = false and coalesce(c.is_deleted, false) = false
    and coalesce(a.is_hidden, false) = false and coalesce(a.is_deleted, false) = false
    and coalesce(q.is_hidden, false) = false and coalesce(q.is_deleted, false) = false
  ))
  order by c.created_at asc;
$$;

grant execute on function public.list_answer_comments(uuid) to anon, authenticated;
