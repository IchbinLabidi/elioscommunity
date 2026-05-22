import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getPublishedSubjects } from '../services/subjectsService';
import { Subject } from '../types/database';

export default function SubjectsListPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublishedSubjects()
      .then(setSubjects)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load subjects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f7f6fb] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Subjects</p>
        <h1 className="mt-2 text-4xl font-black text-elios-navy">Choose a subject</h1>
        {error ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {loading ? <LoadingSpinner /> : subjects.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Link key={subject.id} to={`/subjects/${subject.slug}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f3f2f8] text-xl">{subject.icon ?? '📚'}</span>
                <h2 className="mt-5 text-2xl font-black text-elios-navy">{subject.name}</h2>
                {subject.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{subject.description}</p> : null}
              </Link>
            ))}
          </div>
        ) : <EmptyState icon={BookOpen} title="No subjects yet" message="Published subjects will appear here." />}
      </div>
    </section>
  );
}
