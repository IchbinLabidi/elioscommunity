create or replace function public.list_answer_comments(target_answer_id uuid)
returns table (
  id uuid,
  answer_id uuid,
  question_id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  profile_full_name text,
  profile_avatar_url text,
  profile_role text
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.answer_id,
    c.question_id,
    c.user_id,
    c.content,
    c.created_at,
    c.updated_at,
    c.edited_at,
    c.deleted_at,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url,
    p.role::text as profile_role
  from public.answer_comments c
  join public.profiles p on p.id = c.user_id
  where c.answer_id = target_answer_id
    and auth.uid() is not null
  order by c.created_at asc;
$$;

grant execute on function public.list_answer_comments(uuid) to authenticated;
