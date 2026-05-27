create or replace function public.capture_teacher_earning_from_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  course_row public.courses;
  share_percent numeric;
  gross numeric;
begin
  if new.status = 'approved'
    and (new.payment_proof_path is not null or new.payment_proof_url is not null)
    and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from 'approved')) then
    select * into course_row from public.courses where id = new.course_id;
    if course_row.id is null then return new; end if;

    select coalesce(p.teacher_revenue_share_percent, 50)
      into share_percent
      from public.profiles p
      where p.id = course_row.teacher_id;

    gross := greatest(coalesce(course_row.price, 0), 0);

    insert into public.teacher_earnings (
      teacher_id, course_id, enrollment_id, gross_amount, teacher_share_percent,
      teacher_amount, platform_amount, currency, status, earned_at
    ) values (
      course_row.teacher_id, course_row.id, new.id, gross, share_percent,
      round(gross * share_percent / 100, 3),
      round(gross - (gross * share_percent / 100), 3),
      coalesce(course_row.currency, 'TND'), 'earned', coalesce(new.approved_at, now())
    )
    on conflict (enrollment_id) do update set
      status = 'earned',
      earned_at = coalesce(new.approved_at, public.teacher_earnings.earned_at);
  elsif tg_op = 'UPDATE' and old.status = 'approved' and new.status is distinct from 'approved' then
    update public.teacher_earnings
      set status = case when new.status = 'cancelled' then 'cancelled' else 'refunded' end
      where enrollment_id = new.id
        and status in ('earned', 'pending', 'paid_out');
  end if;

  return new;
end;
$$;

drop trigger if exists course_enrollment_capture_teacher_earning on public.course_enrollments;
create trigger course_enrollment_capture_teacher_earning
  after insert or update of status on public.course_enrollments
  for each row execute function public.capture_teacher_earning_from_enrollment();

insert into public.teacher_earnings (
  teacher_id, course_id, enrollment_id, gross_amount, teacher_share_percent,
  teacher_amount, platform_amount, currency, status, earned_at
)
select
  e.teacher_id, e.course_id, e.id, greatest(coalesce(c.price, 0), 0),
  coalesce(p.teacher_revenue_share_percent, 50),
  round(greatest(coalesce(c.price, 0), 0) * coalesce(p.teacher_revenue_share_percent, 50) / 100, 3),
  round(greatest(coalesce(c.price, 0), 0) - (greatest(coalesce(c.price, 0), 0) * coalesce(p.teacher_revenue_share_percent, 50) / 100), 3),
  coalesce(c.currency, 'TND'), 'earned', coalesce(e.approved_at, e.reviewed_at, e.created_at, now())
from public.course_enrollments e
join public.courses c on c.id = e.course_id
join public.profiles p on p.id = e.teacher_id
where e.status = 'approved'
  and (e.payment_proof_path is not null or e.payment_proof_url is not null)
on conflict (enrollment_id) do nothing;

comment on function public.capture_teacher_earning_from_enrollment() is
  'Creates earning snapshots only for approved enrollments with payment proof.';
