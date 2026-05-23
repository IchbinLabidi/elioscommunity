create or replace function public.protect_discussion_moderation_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_admin() and (
    new.is_hidden is distinct from old.is_hidden
    or new.hidden_reason is distinct from old.hidden_reason
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.is_deleted is distinct from old.is_deleted
    or (tg_table_name <> 'answer_comments' and new.deleted_at is distinct from old.deleted_at)
    or new.deleted_by is distinct from old.deleted_by
    or new.deleted_reason is distinct from old.deleted_reason
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
  ) then
    raise exception 'Only admins can change moderation fields';
  end if;
  return new;
end;
$$;

drop trigger if exists questions_protect_moderation_fields on public.questions;
create trigger questions_protect_moderation_fields before update on public.questions
for each row execute function public.protect_discussion_moderation_fields();

drop trigger if exists answers_protect_moderation_fields on public.answers;
create trigger answers_protect_moderation_fields before update on public.answers
for each row execute function public.protect_discussion_moderation_fields();

drop trigger if exists answer_comments_protect_moderation_fields on public.answer_comments;
create trigger answer_comments_protect_moderation_fields before update on public.answer_comments
for each row execute function public.protect_discussion_moderation_fields();
