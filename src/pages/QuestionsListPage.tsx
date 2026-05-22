import { MessageSquarePlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SearchBar from '../components/ui/SearchBar';
import SubjectFilter from '../components/ui/SubjectFilter';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../lib/debug';
import { getQuestions, getQuestionsWithTeacherAnswerStatus } from '../lib/questionsService';
import { QuestionWithStudent } from '../types/database';

type TeacherQuestionFilter = 'all' | 'open' | 'not_answered_by_me' | 'answered_by_me' | 'answered' | 'closed';

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
  const [error, setError] = useState('');

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
  }, [profile?.id, profile?.role]);

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
          if (profile?.role !== 'teacher') return 0;
          if (first.status === 'open' && second.status !== 'open') return -1;
          if (first.status !== 'open' && second.status === 'open') return 1;
          return 0;
        }),
    [profile?.role, questions, query, status, subject, teacherFilter],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">{profile?.role === 'teacher' ? 'Browse questions' : 'Questions'}</h1>
          <p className="mt-2 text-slate-600">Search student questions and join the learning conversation.</p>
        </div>
        {profile?.role === 'student' ? <Link to="/questions/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
          <MessageSquarePlus className="h-5 w-5" />
          Ask a question
        </Link> : null}
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder="Search questions" />
        </div>
        <SubjectFilter value={subject} onChange={setSubject} />
        {profile?.role === 'teacher' ? (
          <select
            value={teacherFilter}
            onChange={(event) => setTeacherFilter(event.target.value as TeacherQuestionFilter)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky md:w-64"
          >
            {teacherFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
        ) : (
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky md:w-44"
          >
            <option value="">All status</option>
            <option value="open">Open</option>
            <option value="answered">Answered</option>
            <option value="closed">Closed</option>
          </select>
        )}
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      ) : (
        <EmptyState icon={MessageSquarePlus} title="No questions found" message="Try another subject or start the first question in this area." />
      )}
    </section>
  );
}
