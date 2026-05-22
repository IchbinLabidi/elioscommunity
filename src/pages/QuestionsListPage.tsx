import { AlertTriangle, MessageSquarePlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAwareContainer from '../components/layout/LayoutAwareContainer';
import QuestionCard from '../components/QuestionCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SearchBar from '../components/ui/SearchBar';
import SubjectFilter from '../components/ui/SubjectFilter';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole } from '../lib/auth';
import { getErrorMessage } from '../lib/debug';
import { getQuestions, getQuestionsWithTeacherAnswerStatus } from '../lib/questionsService';
import { QuestionWithStudent } from '../types/database';

type TeacherQuestionFilter = 'all' | 'open' | 'not_answered_by_me' | 'answered_by_me' | 'answered' | 'closed';
type QuestionSort = 'newest' | 'oldest' | 'most-answers';

const teacherFilters: Array<{ value: TeacherQuestionFilter; label: string }> = [
  { value: 'all', label: 'All questions' },
  { value: 'open', label: 'Open questions' },
  { value: 'not_answered_by_me', label: 'Not answered by me' },
  { value: 'answered_by_me', label: 'Answered by me' },
  { value: 'answered', label: 'Answered questions' },
  { value: 'closed', label: 'Closed questions' },
];

export default function QuestionsListPage() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<QuestionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<TeacherQuestionFilter>('all');
  const [sort, setSort] = useState<QuestionSort>('newest');
  const [error, setError] = useState('');
  const [retrySignal, setRetrySignal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        setQuestions(profile?.role === 'teacher' && profile.id ? await getQuestionsWithTeacherAnswerStatus(profile.id) : await getQuestions());
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load filtered questions.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.id, profile?.role, retrySignal]);

  const filtered = useMemo(
    () =>
      questions
        .filter((question) => {
        const matchesQuery = `${question.title} ${question.description}`.toLowerCase().includes(query.toLowerCase());
        const matchesSubject = subject ? question.subject === subject : true;
        const matchesStatus = profile?.role === 'teacher'
          ? (
            teacherFilter === 'all'
            || (teacherFilter === 'open' && question.status === 'open')
            || (teacherFilter === 'not_answered_by_me' && !question.teacher_answered)
            || (teacherFilter === 'answered_by_me' && question.teacher_answered)
            || (teacherFilter === 'answered' && question.status === 'answered')
            || (teacherFilter === 'closed' && question.status === 'closed')
          )
          : (status ? question.status === status : true);
        return matchesQuery && matchesSubject && matchesStatus;
      })
        .sort((first, second) => {
          if (sort === 'most-answers') return (second.answer_count ?? 0) - (first.answer_count ?? 0);
          const createdAtDiff = new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
          return sort === 'oldest' ? -createdAtDiff : createdAtDiff;
        }),
    [profile?.role, questions, query, sort, status, subject, teacherFilter],
  );
  const dashboardPath = profile ? dashboardPathForRole(profile.role) : '';
  const askQuestionPath = profile?.role === 'student'
    ? '/questions/new'
    : '/register?role=student&redirect=/questions/new';
  const filtersActive = Boolean(
    query
    || subject
    || (profile?.role === 'teacher' ? teacherFilter !== 'all' : status)
    || sort !== 'newest',
  );
  const clearFilters = () => {
    setQuery('');
    setSubject('');
    setStatus('');
    setTeacherFilter('all');
    setSort('newest');
  };

  return (
    <LayoutAwareContainer className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#DCE5F0] bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-elios-blue">COMMUNITY QUESTIONS</p>
            <h1 className="mt-3 text-3xl font-bold text-elios-navy sm:text-4xl">Questions</h1>
            <p className="mt-3 text-sm leading-6 text-[#526176] sm:text-base">
              Explorez les questions des étudiants et découvrez les réponses des professeurs.
            </p>
          </div>
          {profile?.role !== 'teacher' && profile?.role !== 'admin' ? (
            <Link to={askQuestionPath} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-elios-yellow px-5 py-3 text-sm font-bold text-elios-navy shadow-sm transition hover:bg-yellow-300">
              <MessageSquarePlus className="h-5 w-5" />
              Posez une question
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#DCE5F0] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-elios-sky text-elios-blue">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-elios-navy">Filtrer les discussions</h2>
              <p className="text-xs text-[#526176]">Recherchez par sujet, statut et activité.</p>
            </div>
          </div>
          {filtersActive ? (
            <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-elios-navy transition hover:bg-slate-50">
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.4fr)_minmax(180px,0.9fr)_minmax(180px,0.9fr)_minmax(180px,0.8fr)]">
          <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une question" />
          <SubjectFilter value={subject} onChange={setSubject} />
          {profile?.role === 'teacher' ? (
            <select
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value as TeacherQuestionFilter)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
            >
              {teacherFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
          ) : (
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
            >
              <option value="">Tous les statuts</option>
              <option value="open">Ouvertes</option>
              <option value="answered">Répondues</option>
              <option value="closed">Clôturées</option>
            </select>
          )}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as QuestionSort)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
          >
            <option value="newest">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="most-answers">Plus de réponses</option>
          </select>
        </div>
      </section>
      {error ? (
        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-bold text-elios-navy">Impossible de charger les questions</h2>
              <p className="mt-2 text-sm text-slate-600">Veuillez réessayer dans quelques instants.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setRetrySignal((current) => current + 1)} className="rounded-lg bg-elios-navy px-4 py-3 text-sm font-bold text-white">Réessayer</button>
                {profile ? <Link to={dashboardPath} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">Back to dashboard</Link> : null}
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      ) : filtersActive ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="Aucun résultat trouvé"
          message="Essayez de modifier vos filtres."
          action={<button type="button" onClick={clearFilters} className="rounded-lg bg-elios-navy px-4 py-3 font-bold text-white">Réinitialiser les filtres</button>}
        />
      ) : (
        <EmptyState
          icon={MessageSquarePlus}
          title="Aucune question pour le moment"
          message="Soyez le premier à poser une question à la communauté."
          action={<Link to={askQuestionPath} className="rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Posez une question</Link>}
        />
      )}
    </LayoutAwareContainer>
  );
}
