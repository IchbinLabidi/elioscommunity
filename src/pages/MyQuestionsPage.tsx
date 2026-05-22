import { MessageSquarePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import QuestionCard from '../components/QuestionCard';
import BackButton from '../components/navigation/BackButton';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../lib/debug';
import { getMyQuestions } from '../lib/questionsService';
import { QuestionWithStudent } from '../types/database';

export default function MyQuestionsPage() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<QuestionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setLoading(true);
      setError('');
      try {
        setQuestions(await getMyQuestions(profile.id));
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load your questions.'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile]);

  return (
    <section className="space-y-6">
      <BackButton label="Back to dashboard" fallbackTo="/student/dashboard" />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">My questions</h1>
          <p className="mt-2 text-slate-600">Track everything you have asked in the community.</p>
        </div>
        <Link to="/questions/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
          <MessageSquarePlus className="h-5 w-5" />
          Ask your first question
        </Link>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <LoadingSpinner />
      ) : questions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {questions.map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquarePlus}
          title="You have not asked any questions yet."
          message="Start with a clear title, a helpful description, and an optional image."
          action={<Link to="/questions/new" className="rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Ask your first question</Link>}
        />
      )}
    </section>
  );
}
