alter table public.subjects
  add column if not exists icon_url text,
  add column if not exists color text,
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.questions
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;

create index if not exists subjects_admin_status_idx
  on public.subjects(is_hidden, is_published, is_featured, subject_order);
create index if not exists questions_subject_id_idx on public.questions(subject_id);

update public.questions q
set subject_id = s.id
from public.subjects s
where q.subject_id is null and lower(trim(q.subject)) = lower(trim(s.name));

insert into public.subjects(name, slug, icon, subject_order, is_published)
values
  ('Sciences', 'sciences', 'SCI', 7, true),
  ('Histoire-Géographie', 'histoire-geographie', 'HG', 9, true),
  ('Gestion', 'gestion', 'GES', 11, true),
  ('Technique', 'technique', 'TEC', 12, true)
on conflict (slug) do nothing;
