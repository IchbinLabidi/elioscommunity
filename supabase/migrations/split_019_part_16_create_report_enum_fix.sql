create or replace function public.create_report(
  target_type text,
  target_id uuid,
  reason text,
  description text default null
) returns public.reports
language plpgsql security definer set search_path = public as $$
declare
  created_report public.reports;
  target_schema text;
  target_udt text;
  target_is_enum boolean;
  normalized_target text := case when target_type = 'profile' then 'user' else target_type end;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.is_current_user_blocked() then raise exception 'Your account has been restricted.'; end if;
  if normalized_target not in ('question','answer','answer_comment','rating','course','module','chapter','video','attachment','user') then
    raise exception 'Invalid report target type';
  end if;

  select udt_schema, udt_name into target_schema, target_udt
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'reports'
    and column_name = 'target_type';

  select t.typtype = 'e' into target_is_enum
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = target_schema and t.typname = target_udt;

  if target_is_enum then
    execute format(
      'insert into public.reports(reporter_id,target_type,target_id,reason,description) values ($1,$2::%I.%I,$3,$4,$5) returning *',
      target_schema,
      target_udt
    )
    using auth.uid(), normalized_target, target_id, reason, description
    into created_report;
  else
    insert into public.reports(reporter_id,target_type,target_id,reason,description)
    values (auth.uid(), normalized_target, target_id, reason, description)
    returning * into created_report;
  end if;

  return created_report;
end;
$$;

grant execute on function public.create_report(text, uuid, text, text) to authenticated;
