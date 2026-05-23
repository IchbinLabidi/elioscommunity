import { AlertTriangle, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import BackButton from '../components/navigation/BackButton';
import TeacherCard from '../components/TeacherCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SearchBar from '../components/ui/SearchBar';
import SubjectFilter from '../components/ui/SubjectFilter';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole } from '../lib/auth';
import { getErrorMessage } from '../lib/debug';
import { getTeachers, TeacherFilters } from '../services/teachersService';
import { TeacherWithStats } from '../types/database';

export default function TeachersListPage() {
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([]);
  const [filters, setFilters] = useState<TeacherFilters>({ sort: 'highest-rated' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrySignal, setRetrySignal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    getTeachers(filters)
      .then(setTeachers)
      .catch((err) => setError(getErrorMessage(err, 'Unable to load teachers.')))
      .finally(() => setLoading(false));
  }, [filters, retrySignal]);

  const setFilter = <K extends keyof TeacherFilters>(key: K, value: TeacherFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const clearFilters = () => setFilters({ sort: 'highest-rated' });
  const filtersActive = Boolean(filters.query || filters.subject || filters.minRating || filters.verifiedOnly || (filters.sort && filters.sort !== 'highest-rated'));
  const dashboardPath = profile ? dashboardPathForRole(profile.role) : '';

  const content = (
    <section className="space-y-6">
      {profile ? <BackButton label="Retour au tableau de bord" fallbackTo={dashboardPath} /> : null}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">Profs</h1>
          <p className="mt-2 text-slate-600">Trouvez des professeurs de confiance par spécialité, matière et réputation.</p>
        </div>
        {profile?.role === 'student' ? (
          <div className="flex flex-wrap gap-2">
            <Link to="/courses" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-elios-blue shadow-sm">Parcourir les cours</Link>
            <Link to="/questions/new" className="rounded-lg bg-elios-yellow px-4 py-3 text-sm font-bold text-elios-navy">Posez une question</Link>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto_auto]">
        <SearchBar value={filters.query ?? ''} onChange={(value) => setFilter('query', value)} placeholder="Search by name, specialty, or subject" />
        <SubjectFilter value={filters.subject ?? ''} onChange={(value) => setFilter('subject', value)} />
        <select value={filters.minRating ?? ''} onChange={(event) => setFilter('minRating', event.target.value ? Number(event.target.value) : undefined)} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="">Any rating</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
        <select value={filters.sort ?? 'highest-rated'} onChange={(event) => setFilter('sort', event.target.value as TeacherFilters['sort'])} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="highest-rated">Highest rated</option>
          <option value="most-answers">Most answers</option>
          <option value="newest">Newest</option>
        </select>
        {filtersActive ? <button type="button" onClick={clearFilters} className="rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-elios-blue hover:bg-slate-50">Clear filters</button> : null}
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-elios-navy">
        <input type="checkbox" checked={Boolean(filters.verifiedOnly)} onChange={(event) => setFilter('verifiedOnly', event.target.checked)} />
        Profs vérifiés uniquement
      </label>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-elios-navy">We couldn't load teachers</h2>
              <p className="mt-2 text-sm text-slate-600">There was a problem loading teacher profiles. Please try again.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setRetrySignal((current) => current + 1)} className="rounded-lg bg-elios-navy px-4 py-3 text-sm font-bold text-white">Retry</button>
                {profile ? <Link to={dashboardPath} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">Back to dashboard</Link> : null}
                <Link to="/courses" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">Browse courses</Link>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? <LoadingSpinner /> : teachers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No teachers found"
          message={filtersActive ? 'Try another search term or clear your filters.' : 'Try another filter or browse all teachers.'}
          action={<TeacherEmptyActions onClear={clearFilters} showClear={filtersActive} />}
        />
      )}
    </section>
  );

  return profile ? content : <PageContainer>{content}</PageContainer>;
}

function TeacherEmptyActions({ onClear, showClear }: { onClear: () => void; showClear: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {showClear ? <button type="button" onClick={onClear} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">Clear filters</button> : null}
      <Link to="/courses" className="rounded-lg bg-elios-yellow px-4 py-3 text-sm font-bold text-elios-navy">Browse courses</Link>
    </div>
  );
}
