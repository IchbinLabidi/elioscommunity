alter table public.reports
  add column if not exists description text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists admin_note text,
  add column if not exists updated_at timestamp with time zone default now();

do $$
declare
  status_schema text;
  status_type text;
  status_is_enum boolean;
  target_schema text;
  target_type text;
  target_is_enum boolean;
begin
  select udt_schema, udt_name into status_schema, status_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reports' and column_name = 'status';

  select t.typtype = 'e' into status_is_enum
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = status_schema and t.typname = status_type;

  if status_is_enum then
    execute format('alter type %I.%I add value if not exists %L', status_schema, status_type, 'resolved');
    execute format('alter type %I.%I add value if not exists %L', status_schema, status_type, 'rejected');
  else
    alter table public.reports drop constraint if exists reports_status_check;
    update public.reports set status = 'rejected' where status::text = 'dismissed';
    alter table public.reports add constraint reports_status_check
      check (status::text in ('pending', 'reviewed', 'resolved', 'rejected'));
  end if;

  select udt_schema, udt_name into target_schema, target_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reports' and column_name = 'target_type';

  select t.typtype = 'e' into target_is_enum
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = target_schema and t.typname = target_type;

  if target_is_enum then
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'answer_comment');
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'rating');
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'module');
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'chapter');
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'video');
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'attachment');
    execute format('alter type %I.%I add value if not exists %L', target_schema, target_type, 'user');
  else
    alter table public.reports drop constraint if exists reports_target_type_check;
    update public.reports set target_type = 'user' where target_type::text = 'profile';
    alter table public.reports add constraint reports_target_type_check
      check (target_type::text in ('question','answer','answer_comment','rating','course','module','chapter','video','attachment','user'));
  end if;
end $$;
