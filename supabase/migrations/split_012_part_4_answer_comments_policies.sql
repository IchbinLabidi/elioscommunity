alter table public.answer_comments enable row level security;

drop policy if exists "Participants can read answer comments" on public.answer_comments;
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
