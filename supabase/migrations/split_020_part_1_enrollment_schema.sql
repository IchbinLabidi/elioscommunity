alter table public.courses
  add column if not exists payment_instructions text,
  add column if not exists payment_method text,
  add column if not exists payment_phone text,
  add column if not exists payment_bank_account text;

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  payment_proof_url text,
  payment_proof_path text,
  payment_note text,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(course_id, student_id)
);

create index if not exists course_enrollments_course_id_idx on public.course_enrollments(course_id);
create index if not exists course_enrollments_student_id_idx on public.course_enrollments(student_id);
create index if not exists course_enrollments_teacher_id_idx on public.course_enrollments(teacher_id);
create index if not exists course_enrollments_status_idx on public.course_enrollments(status);
create index if not exists course_enrollments_created_at_idx on public.course_enrollments(created_at desc);

drop trigger if exists course_enrollments_touch_updated_at on public.course_enrollments;
create trigger course_enrollments_touch_updated_at
  before update on public.course_enrollments
  for each row execute function public.touch_updated_at();
