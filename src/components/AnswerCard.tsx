import { Check, Pencil, Save, Star, Trash2, Trophy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AnswerComments from './AnswerComments';
import RateTeacherModal from './RateTeacherModal';
import RatingStars from './RatingStars';
import ReportButton from './ReportButton';
import { formatDate } from '../lib/utils';
import { AnswerWithTeacher, Profile, TeacherRating } from '../types/database';

type AnswerCardProps = {
  answer: AnswerWithTeacher;
  canMarkBest: boolean;
  canEdit: boolean;
  canDelete: boolean;
  questionId: string;
  questionStudentId: string;
  isQuestionOwner: boolean;
  profile: Profile | null;
  existingRating?: TeacherRating | null;
  marking?: boolean;
  busy?: boolean;
  editSignal?: number;
  onMarkBest?: () => Promise<void> | void;
  onUpdate?: (content: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onRatingSuccess?: (rating: TeacherRating) => void;
};

export default function AnswerCard({
  answer,
  canMarkBest,
  canEdit,
  canDelete,
  questionId,
  questionStudentId,
  isQuestionOwner,
  profile,
  existingRating,
  marking,
  busy,
  editSignal,
  onMarkBest,
  onUpdate,
  onDelete,
  onRatingSuccess,
}: AnswerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(answer.content);
  const [localError, setLocalError] = useState('');
  const [ratingOpen, setRatingOpen] = useState(false);
  const answerContentRef = useRef(answer.content);
  const canRate = profile?.role === 'student' && isQuestionOwner;
  const isTeacherOwner = profile?.role === 'teacher' && profile.id === answer.teacher_id;

  useEffect(() => {
    answerContentRef.current = answer.content;
  }, [answer.content]);

  useEffect(() => {
    if (editSignal) {
      setDraft(answerContentRef.current);
      setLocalError('');
      setIsEditing(true);
    }
  }, [editSignal]);

  const save = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < 20) {
      setLocalError('Answer must be at least 20 characters.');
      return;
    }
    if (trimmed.length > 5000) {
      setLocalError('Answer must be 5000 characters or less.');
      return;
    }
    setLocalError('');
    try {
      await onUpdate?.(trimmed);
      setIsEditing(false);
    } catch {
      setLocalError('Unable to update this answer. Please try again.');
    }
  };

  return (
    <article className={`rounded-lg border bg-white p-5 shadow-sm ${answer.is_best ? 'border-elios-yellow ring-2 ring-yellow-100' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={answer.profiles?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${answer.profiles?.full_name || 'Teacher'}`}
            alt=""
            className="h-11 w-11 rounded-lg object-cover"
          />
          <div>
            <p className="font-semibold text-elios-navy">{answer.profiles?.full_name || 'Teacher'}</p>
            <p className="text-sm text-slate-500">{answer.profiles?.specialty || 'Teacher'} - {formatDate(answer.created_at)}</p>
            {typeof answer.rating_average === 'number' ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {answer.rating_average.toFixed(1)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {answer.is_best ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-elios-navy ring-1 ring-elios-yellow">
              <Trophy className="h-4 w-4 text-amber-500" />
              Best answer
            </span>
          ) : canMarkBest ? (
            <button
              type="button"
              onClick={onMarkBest}
              disabled={marking || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-elios-yellow px-3 py-2 text-sm font-bold text-elios-navy disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {marking ? 'Selecting...' : 'Mark as best answer'}
            </button>
          ) : null}

          {canEdit && !isEditing ? (
            <button type="button" onClick={() => setIsEditing(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-navy hover:bg-slate-50 disabled:opacity-60">
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : null}

          {canDelete ? (
            <button type="button" onClick={onDelete} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4">
          {localError ? <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{localError}</p> : null}
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            maxLength={5000}
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraft(answer.content);
                setLocalError('');
              }}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-elios-navy hover:bg-slate-50 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{answer.content}</p>
      )}

      {answer.is_best && isTeacherOwner ? (
        <div className="mt-5 rounded-lg border border-elios-yellow bg-yellow-50 p-3 text-sm font-semibold text-elios-navy">
          Best answer is locked to preserve the validated solution. Add a reply below if you need to clarify or update it.
        </div>
      ) : null}

      {canRate ? (
        <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
          {existingRating ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-elios-navy">You rated this teacher</p>
                <div className="mt-1">
                  <RatingStars value={existingRating.rating} size="sm" />
                </div>
              </div>
              <button type="button" onClick={() => setRatingOpen(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-elios-navy hover:bg-slate-50">
                Edit rating
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-700">Was this answer helpful?</p>
              <button type="button" onClick={() => setRatingOpen(true)} className="rounded-lg bg-elios-yellow px-4 py-2 text-sm font-bold text-elios-navy">
                Rate teacher
              </button>
            </div>
          )}
        </div>
      ) : null}

      {profile ? <div className="mt-4"><ReportButton targetType="answer" targetId={answer.id} /></div> : null}

      <AnswerComments answerId={answer.id} questionStudentId={questionStudentId} answerTeacherId={answer.teacher_id} profile={profile} questionId={questionId} />
      {canRate ? (
        <RateTeacherModal
          isOpen={ratingOpen}
          onClose={() => setRatingOpen(false)}
          teacher={{
            id: answer.teacher_id,
            full_name: answer.profiles?.full_name || 'Teacher',
            avatar_url: answer.profiles?.avatar_url ?? null,
            specialty: answer.profiles?.specialty ?? null,
          }}
          questionId={questionId}
          answerId={answer.id}
          existingRating={existingRating}
          onSuccess={(savedRating) => onRatingSuccess?.(savedRating)}
        />
      ) : null}
    </article>
  );
}
