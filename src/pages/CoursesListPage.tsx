import { AlertTriangle, BookOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import CourseCatalogFilters from '../components/courses/CourseCatalogFilters';
import LayoutAwareContainer from '../components/layout/LayoutAwareContainer';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole } from '../lib/auth';
import { getErrorMessage } from '../lib/debug';
import { CourseFilters, getCourseCatalog } from '../services/coursesService';
import { getPublishedSubjects } from '../services/subjectsService';
import { CourseEnrollment, CourseWithTeacher, Subject } from '../types/database';

export default function CoursesListPage() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<CourseFilters>({ accessStatus: 'all', sort: 'newest' });
  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
  const [enrollments, setEnrollments] = useState<Map<string, CourseEnrollment>>(new Map());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrySignal, setRetrySignal] = useState(0);

  useEffect(() => {
    getPublishedSubjects()
      .then(setSubjects)
      .catch((err) => setError(getErrorMessage(err, 'Unable to load course filters.')));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getCourseCatalog(filters, profile?.role === 'student' ? profile.id : undefined)
      .then(({ courses: rows, enrollmentMap }) => {
        setCourses(rows);
        setEnrollments(enrollmentMap);
      })
      .catch((err) => setError(getErrorMessage(err, 'Unable to load published courses.')))
      .finally(() => setLoading(false));
  }, [filters, profile?.id, profile?.role, retrySignal]);

  const options = useMemo(() => ({
    levels: Array.from(new Set(courses.map((course) => course.level).filter(Boolean))),
    teachers: Array.from(new Map(courses.map((course) => [
      course.teacher_id,
      { id: course.teacher_id, name: course.profiles?.full_name ?? 'Elios teacher' },
    ])).values()),
  }), [courses]);

  const updateFilter = <K extends keyof CourseFilters>(key: K, value: CourseFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const dashboardPath = profile ? dashboardPathForRole(profile.role) : '';

  return (
    <LayoutAwareContainer className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-elios-blue">Course catalog</p>
          <h1 className="mt-2 text-3xl font-bold text-elios-navy">Browse courses</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Discover published courses, compare access options, and keep purchased courses clearly marked.</p>
        </div>
        {profile?.role === 'student' ? (
          <Link to="/student/courses" className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-elios-blue shadow-sm">
            My courses
          </Link>
        ) : null}
      </div>
      <CourseCatalogFilters
        filters={filters}
        subjects={subjects}
        levels={options.levels}
        teachers={options.teachers}
        showAccessStatus={profile?.role === 'student'}
        onChange={updateFilter}
      />
      {error ? (
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-bold text-elios-navy">We couldn't load courses</h2>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setRetrySignal((current) => current + 1)} className="rounded-lg bg-elios-navy px-4 py-3 text-sm font-bold text-white">Retry</button>
                {profile ? <Link to={dashboardPath} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">Back to dashboard</Link> : null}
              </div>
            </div>
          </div>
        </div>
      ) : loading ? <LoadingSpinner label="Loading course catalog" /> : courses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => <CourseCard key={course.id} course={course} enrollment={enrollments.get(course.id)} />)}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No courses match these filters." message="Try a broader search or switch the access filter." />
      )}
    </LayoutAwareContainer>
  );
}
