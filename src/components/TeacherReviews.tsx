import RatingStars from './RatingStars';
import ReportButton from './ReportButton';
import { formatDate } from '../lib/utils';
import { TeacherRatingWithStudent } from '../types/database';

export default function TeacherReviews({ reviews }: { reviews: TeacherRatingWithStudent[] }) {
  if (!reviews.length) return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No ratings yet.</p>;

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-elios-navy">{review.profiles?.full_name || 'Student'}</p>
              {review.question_title ? <p className="text-xs text-slate-500">{review.question_title}</p> : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
              <ReportButton targetType="rating" targetId={review.id} />
            </div>
          </div>
          <div className="mt-2"><RatingStars value={review.rating} size="sm" /></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{review.review || 'No written review.'}</p>
        </article>
      ))}
    </div>
  );
}
