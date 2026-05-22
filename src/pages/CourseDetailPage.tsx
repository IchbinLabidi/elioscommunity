import { BookOpen, ExternalLink, Lock, MessageCircle, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CourseCurriculum from '../components/CourseCurriculum';
import ReportButton from '../components/ReportButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { money } from '../lib/utils';
import { getPublishedCourseById } from '../services/coursesService';
import { getPublicCourseContent } from '../services/courseContentService';
import { getCourseAccess } from '../services/enrollmentsService';
import { CourseWithContent, CourseWithTeacher, TeacherPublicStats, TeacherStats } from '../types/database';

function firstStats(stats?: TeacherPublicStats[] | TeacherPublicStats | TeacherStats[] | TeacherStats | null) {
  return Array.isArray(stats) ? stats[0] : stats;
}

function averageRating(stats?: TeacherPublicStats | TeacherStats | null) {
  if (!stats) return 0;
  return 'average_rating' in stats ? Number(stats.average_rating) : Number(stats.rating_average);
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile, session, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<CourseWithContent | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!courseId) return;
    if (authLoading) return;
    setLoading(true);
    setError('');
    Promise.all([getPublishedCourseById(courseId), getCourseAccess(courseId)])
      .then(([courseData, access]) => Promise.all([getPublicCourseContent(courseData as CourseWithTeacher), Promise.resolve(access)]))
      .then(([content, access]) => {
        setCourse(content);
        setHasAccess(access);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load course.'))
      .finally(() => setLoading(false));
  }, [authLoading, courseId, profile?.role, session?.user.id]);

  if (loading) return <LoadingSpinner />;
  if (error || !course) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || 'Course not found.'}</p>;

  const teacher = course.profiles;
  const stats = firstStats(teacher?.teacher_public_stats ?? teacher?.teacher_stats);
  const price = Number(course.price) === 0 ? 'Free' : money(Number(course.price), course.currency ?? 'TND');
  const whatsapp = course.contact_whatsapp?.replace(/\D/g, '') || '';
  const paid = Number(course.price) > 0;

  const enroll = () => {
    setActionError('');
    if (!session) {
      navigate(`/login?redirect=/courses/${course.id}/enroll`, { state: { from: { pathname: `/courses/${course.id}/enroll` } } });
      return;
    }
    if (profile?.role !== 'student') {
      setActionError('Only students can enroll in courses.');
      return;
    }
    navigate(`/courses/${course.id}/enroll`);
  };

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
              <span className="rounded-full bg-elios-sky px-3 py-1 text-elios-blue">{course.subject}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{course.level}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 capitalize">{course.format}</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold text-elios-navy md:text-4xl">{course.title}</h1>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">{course.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-lg bg-elios-yellow px-4 py-2 text-lg font-bold text-elios-navy">{price}</span>
              {course.duration ? <span className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-600">{course.duration}</span> : null}
              <span className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-600">{course.chapters.length} chapters</span>
            </div>
            <div className="mt-4">
              <ReportButton targetType="course" targetId={course.id} />
            </div>
            {teacher ? (
              <Link to={`/teachers/${teacher.id}`} className="mt-6 flex w-fit items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                <img src={teacher.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.full_name}`} alt="" className="h-11 w-11 rounded-lg object-cover" />
                <span>
                  <span className="block text-sm font-bold text-elios-navy">{teacher.full_name}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500"><Star className="h-3 w-3 fill-elios-yellow text-elios-yellow" />{averageRating(stats).toFixed(1)} rating</span>
                </span>
              </Link>
            ) : null}
          </div>
          <div className="bg-elios-sky">
            {course.cover_url ? <img src={course.cover_url} alt="" className="h-full min-h-72 w-full object-cover" /> : <div className="grid h-full min-h-72 place-items-center p-8 text-center text-2xl font-bold text-elios-blue">{course.subject}</div>}
          </div>
        </div>
      </div>

      {paid ? (
        <div className="flex flex-col gap-3 rounded-lg border border-elios-yellow bg-yellow-50 p-4 text-sm text-elios-navy sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 font-semibold"><Lock className="h-5 w-5" />{hasAccess ? 'Your enrollment is approved. Full content is unlocked.' : 'Paid course content is locked except free preview lessons.'}</span>
          {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-navy px-4 py-3 font-bold text-white"><MessageCircle className="h-4 w-4" />Contact teacher</a> : null}
          {hasAccess ? (
            <Link to={`/courses/${course.id}/learn`} className="inline-flex items-center justify-center rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Start learning</Link>
          ) : (
            <button type="button" onClick={enroll} className="inline-flex items-center justify-center rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Enroll</button>
          )}
          {course.course_link ? <a href={course.course_link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-elios-navy/20 bg-white px-4 py-3 font-bold text-elios-navy">External course <ExternalLink className="h-4 w-4" /></a> : null}
        </div>
      ) : (
        <Link to={`/courses/${course.id}/learn`} className="inline-flex items-center justify-center rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Start learning</Link>
      )}
      {actionError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p> : null}

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-elios-navy"><BookOpen className="h-6 w-6" />Course curriculum</h2>
        <CourseCurriculum course={course} hasFullAccess={hasAccess} />
      </div>
    </section>
  );
}
