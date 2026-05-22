alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;
drop policy if exists "Admins can manage notifications" on public.notifications;

create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can manage notifications"
  on public.notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;
