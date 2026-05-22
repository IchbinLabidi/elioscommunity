import { GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import TeacherCard from '../components/TeacherCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SearchBar from '../components/ui/SearchBar';
import SubjectFilter from '../components/ui/SubjectFilter';
import { getTeachers, TeacherFilters } from '../services/teachersService';
import { TeacherWithStats } from '../types/database';

export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([]);
  const [filters, setFilters] = useState<TeacherFilters>({ sort: 'highest-rated' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getTeachers(filters)
      .then(setTeachers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load teachers.'))
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = <K extends keyof TeacherFilters>(key: K, value: TeacherFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">Teachers</h1>
        <p className="mt-2 text-slate-600">Find trusted educators by specialty, subject, and reputation.</p>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
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
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-elios-navy">
        <input type="checkbox" checked={Boolean(filters.verifiedOnly)} onChange={(event) => setFilter('verifiedOnly', event.target.checked)} />
        Verified teachers only
      </label>
      {loading ? <LoadingSpinner /> : teachers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No teachers found" message="Try another search term or check back as the community grows." />
      )}
    </PageContainer>
  );
}
