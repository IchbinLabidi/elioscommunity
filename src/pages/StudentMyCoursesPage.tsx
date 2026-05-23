import { useEffect, useMemo, useState } from 'react';
import EmptyPurchasedCourses from '../components/courses/EmptyPurchasedCourses';
import StudentCourseCard from '../components/courses/StudentCourseCard';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getErrorMessage } from '../lib/debug';
import { getMyPurchasedCourses, StudentCourseFilters, StudentPurchasedCourse } from '../services/studentCoursesService';

export default function StudentMyCoursesPage() {
  const [filters, setFilters] = useState<StudentCourseFilters>({ sort: 'approved-recent' });
  const [courses, setCourses] = useState<StudentPurchasedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyPurchasedCourses(filters)
      .then(setCourses)
      .catch((err) => setError(getErrorMessage(err, 'Unable to load your purchased courses.')))
      .finally(() => setLoading(false));
  }, [filters]);

  const options = useMemo(() => ({
    subjects: Array.from(new Map(courses.map((course) => [course.subject_id ?? course.subject, { id: course.subject_id ?? course.subject, name: course.subjects?.name ?? course.subject }])).values()),
    levels: Array.from(new Set(courses.map((course) => course.level).filter(Boolean))),
    teachers: Array.from(new Map(courses.map((course) => [course.teacher_id, { id: course.teacher_id, name: course.profiles?.full_name ?? 'sosprof.tn prof' }])).values()),
  }), [courses]);

  const setFilter = <K extends keyof StudentCourseFilters>(key: K, value: StudentCourseFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="space-y-6">
      <BackButton label="Back to dashboard" fallbackTo="/student/dashboard" />
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">My Courses</h1>
        <p className="mt-2 text-slate-600">Courses you have purchased or unlocked.</p>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.5fr_repeat(4,1fr)]">
        <input value={filters.query ?? ''} onChange={(event) => setFilter('query', event.target.value)} placeholder="Search purchased courses" className="rounded-lg border border-slate-200 px-3 py-3 text-sm" />
        <select value={filters.subject ?? ''} onChange={(event) => setFilter('subject', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
          <option value="">All subjects</option>
          {options.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <select value={filters.level ?? ''} onChange={(event) => setFilter('level', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
          <option value="">All levels</option>
          {options.levels.map((level) => <option key={level}>{level}</option>)}
        </select>
        <select value={filters.teacherId ?? ''} onChange={(event) => setFilter('teacherId', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
          <option value="">All teachers</option>
          {options.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
        <select value={filters.sort ?? 'approved-recent'} onChange={(event) => setFilter('sort', event.target.value as StudentCourseFilters['sort'])} className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
          <option value="approved-recent">Recently approved</option>
          <option value="accessed-recent">Recently accessed</option>
        </select>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading your courses" /> : courses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => <StudentCourseCard key={course.id} course={course} />)}
        </div>
      ) : <EmptyPurchasedCourses />}
    </section>
  );
}
