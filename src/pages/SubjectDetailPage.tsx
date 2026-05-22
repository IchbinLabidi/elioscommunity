import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getPublishedCourses } from '../services/coursesService';
import { getSubjectBySlug } from '../services/subjectsService';
import { CourseWithTeacher, Subject } from '../types/database';

export default function SubjectDetailPage() {
  const { subjectSlug } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subjectSlug) return;
    setLoading(true);
    Promise.all([getSubjectBySlug(subjectSlug), getPublishedCourses()])
      .then(([subjectData, allCourses]) => {
        setSubject(subjectData);
        setCourses(allCourses.filter((course) => course.subject_id === subjectData.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load subject.'))
      .finally(() => setLoading(false));
  }, [subjectSlug]);

  if (loading) return <LoadingSpinner />;
  if (error || !subject) return <p className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || 'Subject not found.'}</p>;

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f7f6fb] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Subject</p>
        <h1 className="mt-2 text-4xl font-black text-elios-navy">{subject.name}</h1>
        {subject.description ? <p className="mt-2 max-w-2xl text-slate-600">{subject.description}</p> : null}
        {courses.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState icon={BookOpen} title="No courses yet" message="Courses for this subject will appear here." />
          </div>
        )}
      </div>
    </section>
  );
}
