import { BookOpen, CalendarClock, Eye, EyeOff, ListVideo, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import BackButton from '../components/navigation/BackButton';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { useAuth } from '../contexts/AuthContext';
import { deleteCourse, getMyCourses, toggleCoursePublished } from '../services/coursesService';
import { Course } from '../types/database';

export default function TeacherCoursesPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Course | null>(null);

  const load = () => {
    if (!profile) return;
    setLoading(true);
    getMyCourses(profile.id)
      .then(setCourses)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load courses.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [profile]);

  const remove = async () => {
    if (!deleting) return;
    await deleteCourse(deleting.id);
    setDeleting(null);
    load();
  };

  const toggle = async (course: Course) => {
    await toggleCoursePublished(course.id, !course.is_published);
    load();
  };

  return (
    <section className="space-y-6">
      <BackButton label="Back to dashboard" fallbackTo="/teacher/dashboard" />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">Your courses</h1>
          <p className="mt-2 text-slate-600">Promote learning offers directly from your profile.</p>
        </div>
        <Link to="/teacher/courses/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
          <Plus className="h-5 w-5" />
          New course
        </Link>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : courses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              actions={
                <div className="flex gap-2">
                  <button title={course.is_published ? 'Unpublish course' : 'Publish course'} onClick={() => toggle(course)} className="rounded-lg border border-slate-200 p-2 text-elios-blue">
                    {course.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <Link title="Manage content" to={`/teacher/courses/${course.id}/builder`} className="rounded-lg border border-slate-200 p-2 text-elios-blue"><ListVideo className="h-4 w-4" /></Link>
                  <Link title="Sessions live" to={`/teacher/courses/${course.id}/live-sessions`} className="rounded-lg border border-slate-200 p-2 text-elios-blue"><CalendarClock className="h-4 w-4" /></Link>
                  <Link title="Edit course" to={`/teacher/courses/${course.id}/edit`} className="rounded-lg border border-slate-200 p-2 text-elios-blue"><Pencil className="h-4 w-4" /></Link>
                  <button title="Delete course" onClick={() => setDeleting(course)} className="rounded-lg border border-slate-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="You have not created any courses yet." message="Create your first course and it will appear on your public teacher profile." action={<Link to="/teacher/courses/new" className="rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Create course</Link>} />
      )}
      <ActionDialog open={Boolean(deleting)} title="Supprimer ce cours ?" message={deleting?.title} confirmLabel="Supprimer" danger resetKey={deleting?.id} onClose={() => setDeleting(null)} onConfirm={() => void remove()} />
    </section>
  );
}
