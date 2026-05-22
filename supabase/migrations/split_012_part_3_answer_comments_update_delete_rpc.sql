create or replace function public.update_answer_comment(target_comment_id uuid, new_content text)
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
  if auth.uid() is null then raise exception 'You must be logged in to edit a reply.'; end if;
  if char_length(trimmed_content) < 1 or char_length(trimmed_content) > 2000 then
    raise exception 'Comment must be between 1 and 2000 characters.';
  end if;

  select * into comment_row from public.answer_comments where id = target_comment_id;
  if comment_row.id is null or comment_row.deleted_at is not null then
    raise exception 'Comment not found.';
  end if;
  if comment_row.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'You can only edit your own comment.';
  end if;

  update public.answer_comments
  set content = trimmed_content, edited_at = now()
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
  if auth.uid() is null then raise exception 'You must be logged in to delete a reply.'; end if;
  select * into comment_row from public.answer_comments where id = target_comment_id;
  if comment_row.id is null then raise exception 'Comment not found.'; end if;
  if comment_row.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'You can only delete your own comment.';
  end if;
  update public.answer_comments set deleted_at = now() where id = target_comment_id;
  return true;
end;
$$;
