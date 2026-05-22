create or replace function public.update_teacher_rating(
  target_rating_id uuid,
  rating_value integer,
  review_text text default null
)
returns public.ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  rating_row public.ratings;
begin
  if auth.uid() is null then raise exception 'You must be logged in to update a rating.'; end if;
  if rating_value < 1 or rating_value > 5 then raise exception 'Rating must be between 1 and 5.'; end if;
  if char_length(coalesce(review_text, '')) > 1000 then raise exception 'Review must be 1000 characters or less.'; end if;
  update public.ratings
  set rating = rating_value, review = nullif(btrim(coalesce(review_text, '')), '')
  where id = target_rating_id and (student_id = auth.uid() or public.is_admin())
  returning * into rating_row;
  if rating_row.id is null then raise exception 'Rating not found or you cannot update it.'; end if;
  return rating_row;
end;
$$;

create or replace function public.get_teacher_rating_stats(target_teacher_id uuid)
returns table (teacher_id uuid, average_rating numeric, total_ratings integer, total_reviews integer)
language sql
security definer
set search_path = public
as $$
  select target_teacher_id, coalesce(avg(r.rating), 0)::numeric(3,2),
         count(r.id)::integer,
         count(r.id) filter (where nullif(btrim(coalesce(r.review, '')), '') is not null)::integer
  from public.ratings r
  where r.teacher_id = target_teacher_id;
$$;
