import { Search } from 'lucide-react';
import { CourseFilters } from '../../services/coursesService';
import { Subject } from '../../types/database';

type TeacherOption = {
  id: string;
  name: string;
};

export default function CourseCatalogFilters({
  filters,
  subjects,
  levels,
  teachers,
  showAccessStatus,
  onChange,
}: {
  filters: CourseFilters;
  subjects: Subject[];
  levels: string[];
  teachers: TeacherOption[];
  showAccessStatus: boolean;
  onChange: <K extends keyof CourseFilters>(key: K, value: CourseFilters[K]) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(0,1fr))]">
        <label className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={filters.query ?? ''}
            onChange={(event) => onChange('query', event.target.value)}
            placeholder="Search courses"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select value={filters.subject ?? ''} onChange={(event) => onChange('subject', event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="">Toutes les matières</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <select value={filters.level ?? ''} onChange={(event) => onChange('level', event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="">All levels</option>
          {levels.map((level) => <option key={level}>{level}</option>)}
        </select>
        <select value={filters.teacherId ?? ''} onChange={(event) => onChange('teacherId', event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="">All teachers</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
        <select value={filters.priceType ?? ''} onChange={(event) => onChange('priceType', event.target.value as CourseFilters['priceType'])} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="">Any price</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
        {showAccessStatus ? (
          <select value={filters.accessStatus ?? 'all'} onChange={(event) => onChange('accessStatus', event.target.value as CourseFilters['accessStatus'])} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
            <option value="all">All access</option>
            <option value="purchased">Purchased</option>
            <option value="not-purchased">Not purchased</option>
            <option value="pending">Pending review</option>
          </select>
        ) : (
          <select value={filters.sort ?? 'newest'} onChange={(event) => onChange('sort', event.target.value as CourseFilters['sort'])} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
            <option value="newest">Newest</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="highest-rated-teacher">Highest rated teacher</option>
          </select>
        )}
      </div>
      {showAccessStatus ? (
        <div className="mt-3 flex justify-end">
          <select value={filters.sort ?? 'newest'} onChange={(event) => onChange('sort', event.target.value as CourseFilters['sort'])} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm sm:w-60">
            <option value="newest">Newest</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="highest-rated-teacher">Highest rated teacher</option>
          </select>
        </div>
      ) : null}
    </section>
  );
}
