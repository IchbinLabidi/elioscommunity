import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import RatingStars from './RatingStars';
import { getErrorMessage } from '../lib/debug';
import { createTeacherRating, updateTeacherRating } from '../services/ratingsService';
import { Profile, TeacherRating } from '../types/database';

type RateTeacherModalProps = {
  isOpen: boolean;
  onClose: () => void;
  teacher: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'specialty'>;
  questionId: string;
  answerId: string;
  existingRating?: TeacherRating | null;
  onSuccess: (rating: TeacherRating) => void;
};

export default function RateTeacherModal({
  isOpen,
  onClose,
  teacher,
  questionId,
  answerId,
  existingRating,
  onSuccess,
}: RateTeacherModalProps) {
  const [rating, setRating] = useState(existingRating?.rating ?? 0);
  const [review, setReview] = useState(existingRating?.review ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRating(existingRating?.rating ?? 0);
    setReview(existingRating?.review ?? '');
    setError('');
  }, [existingRating, isOpen]);

  if (!isOpen) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating) {
      setError('Please choose a star rating.');
      return;
    }
    if (review.trim().length > 1000) {
      setError('Review must be 1000 characters or less.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const saved = existingRating
        ? await updateTeacherRating(existingRating.id, rating, review)
        : await createTeacherRating(teacher.id, questionId, answerId, rating, review);
      onSuccess(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit rating.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-elios-navy">Rate this teacher</h2>
            <p className="mt-1 text-sm text-slate-600">How helpful was this answer?</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close rating modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <img
            src={teacher.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.full_name}`}
            alt=""
            className="h-12 w-12 rounded-lg object-cover"
          />
          <div>
            <p className="font-bold text-elios-navy">{teacher.full_name}</p>
            <p className="text-sm text-slate-500">{teacher.specialty || 'Teacher'}</p>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5">
          <RatingStars value={rating} onChange={setRating} size="md" />
        </div>

        <label className="mt-5 block text-sm font-semibold text-elios-navy">
          Review
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Share a short review about this teacher's help..."
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
          />
        </label>
        <div className="mt-2 text-right text-xs text-slate-500">{review.length}/1000</div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-navy hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-elios-yellow px-4 py-3 text-sm font-bold text-elios-navy disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit rating'}
          </button>
        </div>
      </form>
    </div>
  );
}
