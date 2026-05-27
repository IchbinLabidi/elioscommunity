import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AnswerCard from '../components/AnswerCard';
import LayoutAwareContainer from '../components/layout/LayoutAwareContainer';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DraftStatus from '../components/forms/DraftStatus';
import ActionDialog from '../components/ui/ActionDialog';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import { getErrorMessage } from '../lib/debug';
import { getQuestionById } from '../lib/questionsService';
import { formatDate } from '../lib/utils';
import { createAnswer, deleteAnswer, getAnswersByQuestionId, markBestAnswer, updateAnswer } from '../services/answersService';
import { getRatingsForAnswers } from '../services/ratingsService';
import { AnswerWithTeacher, QuestionWithStudent, TeacherRating } from '../types/database';

export default function QuestionDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { profile } = useAuth();
  const answerFormRef = useRef<HTMLFormElement | null>(null);
  const [question, setQuestion] = useState<QuestionWithStudent | null>(null);
  const [answers, setAnswers] = useState<AnswerWithTeacher[]>([]);
  const [content, setContent] = useState('');
  const [ratingsByTeacher, setRatingsByTeacher] = useState<Map<string, TeacherRating>>(new Map());
  const [loading, setLoading] = useState(true);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyAnswerId, setBusyAnswerId] = useState<string | null>(null);
  const [markingAnswerId, setMarkingAnswerId] = useState<string | null>(null);
  const [editSignal, setEditSignal] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingAnswer, setDeletingAnswer] = useState<AnswerWithTeacher | null>(null);
  const answerDraft = useFormDraft({
    key: draftKey(profile?.id, `teacher:answer-question:${id ?? 'question'}`),
    values: { content },
    onRestore: (values) => setContent(values.content),
    expiresInMs: 24 * 60 * 60 * 1000,
    enabled: profile?.role === 'teacher',
  });

  const isOwner = profile?.id === question?.student_id;
  const myTeacherAnswer = useMemo(
    () => profile?.role === 'teacher' ? answers.find((answer) => answer.teacher_id === profile.id) ?? null : null,
    [answers, profile],
  );
  const canAnswer = profile?.role === 'teacher' && question?.status !== 'closed' && !myTeacherAnswer;
  const bestAnswer = useMemo(() => answers.find((answer) => answer.is_best || answer.id === question?.best_answer_id), [answers, question]);

  const loadAnswers = useCallback(async () => {
    if (!id) return;
    setAnswersLoading(true);
    try {
      const answerData = await getAnswersByQuestionId(id);
      setAnswers(answerData);
      if (profile?.role === 'student' && profile.id === question?.student_id) {
        setRatingsByTeacher(await getRatingsForAnswers(id));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load answers.'));
    } finally {
      setAnswersLoading(false);
    }
  }, [id, profile, question?.student_id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [questionData, answerData] = await Promise.all([getQuestionById(id), getAnswersByQuestionId(id)]);
      setQuestion(questionData);
      setAnswers(answerData);
      if (profile?.role === 'student' && profile.id === questionData.student_id) {
        setRatingsByTeacher(await getRatingsForAnswers(id));
      } else {
        setRatingsByTeacher(new Map());
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load question.'));
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (location.hash === '#answer') {
      answerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, loading]);

  const addAnswer = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !id) return;
    if (profile.role !== 'teacher') {
      setError('Only teachers can answer questions.');
      return;
    }
    if (myTeacherAnswer) {
      setError('You have already answered this question. You can edit your existing answer instead.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await createAnswer(id, content);
      answerDraft.clearDraft();
      setContent('');
      setSuccess('Answer submitted.');
      await loadAnswers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit answer.'));
    } finally {
      setSubmitting(false);
    }
  };

  const editAnswer = async (answerId: string, nextContent: string) => {
    setError('');
    setSuccess('');
    setBusyAnswerId(answerId);
    try {
      await updateAnswer(answerId, nextContent);
      setSuccess('Answer updated.');
      await loadAnswers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update answer.'));
      throw err;
    } finally {
      setBusyAnswerId(null);
    }
  };

  const removeAnswer = async (answer: AnswerWithTeacher) => {
    if (answer.is_best && profile?.role === 'teacher') {
      setError('This answer is selected as best answer and cannot be deleted.');
      return;
    }
    setError('');
    setSuccess('');
    setBusyAnswerId(answer.id);
    try {
      await deleteAnswer(answer.id, { allowBestAnswerDelete: profile?.role === 'admin' });
      setSuccess('Answer deleted.');
      setDeletingAnswer(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete answer.'));
    } finally {
      setBusyAnswerId(null);
    }
  };

  const editMyAnswer = () => {
    if (!myTeacherAnswer) return;
    if (myTeacherAnswer.is_best) {
      setError('This answer is selected as best answer and cannot be edited. Add a reply instead.');
      return;
    }
    setEditSignal((current) => current + 1);
    requestAnimationFrame(() => {
      document.getElementById(`answer-${myTeacherAnswer.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const markBest = async (answer: AnswerWithTeacher) => {
    if (!question) return;
    setError('');
    setSuccess('');
    setMarkingAnswerId(answer.id);
    try {
      await markBestAnswer(question.id, answer.id);
      setSuccess('Best answer selected.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to mark best answer.'));
    } finally {
      setMarkingAnswerId(null);
    }
  };

  if (loading) return <LayoutAwareContainer><LoadingSpinner /></LayoutAwareContainer>;
  if (!question) return <LayoutAwareContainer><p className="rounded-lg bg-white p-6 text-slate-600">Question not found.</p></LayoutAwareContainer>;

  const emptyMessage = profile?.role === 'teacher'
    ? 'Be the first teacher to answer this question.'
    : 'No answers yet. Teachers will answer soon.';
  const askQuestionPath = profile?.role === 'student'
    ? '/questions/new'
    : '/register?role=student&redirect=/questions/new';

  return (
    <LayoutAwareContainer className="space-y-6">
      <BackButton label="Back to questions" fallbackTo="/questions" />
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-elios-sky px-3 py-1 text-xs font-bold text-elios-blue">{question.subject}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{question.status}</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-elios-navy">{question.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Asked by {question.profiles?.full_name || 'Student'} on {formatDate(question.created_at)}</p>
        <p className="mt-5 whitespace-pre-line leading-7 text-slate-700">{question.description}</p>
        {question.image_url ? <img src={question.image_url} alt="" className="mt-5 aspect-video max-h-[420px] w-full rounded-lg object-cover" /> : null}
      </article>

      {bestAnswer && isOwner ? (
        <div className="rounded-lg border border-elios-yellow bg-yellow-50 p-4">
          <p className="font-bold text-elios-navy">Best answer selected. You can rate this teacher from their answer if you have not already.</p>
        </div>
      ) : null}

      {profile?.role === 'teacher' && myTeacherAnswer ? (
        <div className="rounded-lg border border-elios-yellow bg-yellow-50 p-5 shadow-sm">
          <p className="text-lg font-bold text-elios-navy">You already answered this question.</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {myTeacherAnswer.content.length > 320 ? `${myTeacherAnswer.content.slice(0, 320)}...` : myTeacherAnswer.content}
          </p>
          {myTeacherAnswer.is_best ? (
            <p className="mt-4 rounded-lg border border-elios-yellow bg-white/70 p-3 text-sm font-semibold text-elios-navy">
              Best answer is locked to preserve the validated solution. Add a reply under your answer if you need to clarify or update it.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={editMyAnswer} className="rounded-lg bg-elios-navy px-4 py-3 text-sm font-bold text-white">
                Edit my answer
              </button>
              <button type="button" onClick={() => removeAnswer(myTeacherAnswer)} disabled={busyAnswerId === myTeacherAnswer.id} className="rounded-lg border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
                {busyAnswerId === myTeacherAnswer.id ? 'Deleting...' : 'Delete my answer'}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {canAnswer ? (
        <form ref={answerFormRef} onSubmit={addAnswer} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold text-elios-navy">
            Your answer
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              minLength={20}
              maxLength={5000}
              placeholder="Explain the solution clearly so the student can learn from it."
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
              required
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Minimum 20 characters.</span>
            <span>{content.length}/5000</span>
          </div>
          <button disabled={submitting} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-elios-navy px-5 py-3 font-bold text-white disabled:opacity-60">
            <MessageSquarePlus className="h-5 w-5" />
            {submitting ? 'Submitting...' : 'Submit answer'}
          </button>
          <div className="mt-3"><DraftStatus status={answerDraft.status} lastSavedAt={answerDraft.lastSavedAt} /></div>
        </form>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-elios-navy">
          {answers.length} answer{answers.length === 1 ? '' : 's'}
        </h2>
        {answersLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading answers...</div>
        ) : answers.length ? (
          answers.map((answer) => (
            <div id={`answer-${answer.id}`} key={answer.id}>
              <AnswerCard
                answer={answer}
                questionStudentId={question.student_id}
                profile={profile}
                canMarkBest={Boolean(isOwner && !question.best_answer_id && !answer.is_best)}
                canEdit={Boolean(profile?.role === 'teacher' && profile.id === answer.teacher_id && !answer.is_best)}
                canDelete={Boolean((profile?.role === 'teacher' && profile.id === answer.teacher_id && !answer.is_best) || profile?.role === 'admin')}
                questionId={question.id}
                marking={markingAnswerId === answer.id}
                busy={busyAnswerId === answer.id}
                editSignal={answer.id === myTeacherAnswer?.id ? editSignal : 0}
                isQuestionOwner={Boolean(isOwner)}
                existingRating={ratingsByTeacher.get(answer.teacher_id) ?? null}
                onMarkBest={() => markBest(answer)}
                onUpdate={(nextContent) => editAnswer(answer.id, nextContent)}
                onDelete={() => setDeletingAnswer(answer)}
                onRatingSuccess={(savedRating) => {
                  setRatingsByTeacher((current) => new Map(current).set(savedRating.teacher_id, savedRating));
                  setSuccess('Rating submitted.');
                  void loadAnswers();
                }}
              />
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            {emptyMessage}
          </div>
        )}
      </div>

      {!profile ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-elios-navy">Connectez-vous pour participer à la discussion.</h2>
            <p className="mt-2 text-sm text-slate-600">Découvrez les réponses librement, puis créez un compte pour commenter et échanger avec la communauté.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/register?role=student&redirect=${encodeURIComponent(`/questions/${question.id}`)}`} className="rounded-lg bg-elios-yellow px-4 py-3 text-sm font-bold text-elios-navy">Créer un compte</Link>
              <Link to={`/login?redirect=${encodeURIComponent(`/questions/${question.id}`)}`} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-navy">Connexion</Link>
            </div>
          </div>
          <div className="rounded-xl border border-elios-yellow bg-yellow-50 p-5">
            <h2 className="text-lg font-bold text-elios-navy">Need help with your own question?</h2>
            <p className="mt-2 text-sm text-slate-700">Registered students can ask the community and receive teacher answers.</p>
            <Link to={askQuestionPath} className="mt-4 inline-flex rounded-lg bg-elios-navy px-4 py-3 text-sm font-bold text-white">
              Posez une question
            </Link>
          </div>
        </div>
      ) : null}
      <ActionDialog open={Boolean(deletingAnswer)} title="Supprimer cette réponse ?" message="Cette réponse sera retirée de la discussion." confirmLabel="Supprimer" danger busy={busyAnswerId === deletingAnswer?.id} resetKey={deletingAnswer?.id} onClose={() => setDeletingAnswer(null)} onConfirm={() => deletingAnswer ? void removeAnswer(deletingAnswer) : undefined} />

    </LayoutAwareContainer>
  );
}
