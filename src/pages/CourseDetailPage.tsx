import { BookOpen, ExternalLink, MessageCircle, Share2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CourseCurriculum from '../components/CourseCurriculum';
import StudentLiveSessionsPanel from '../components/live/StudentLiveSessionsPanel';
import LayoutAwareContainer from '../components/layout/LayoutAwareContainer';
import BackButton from '../components/navigation/BackButton';
import ReportButton from '../components/ReportButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { money } from '../lib/utils';
import { getPublishedCourseById } from '../services/coursesService';
import { getPublicCourseContent } from '../services/courseContentService';
import { getCourseAccess, getMyEnrollmentForCourse } from '../services/enrollmentsService';
import { getCourseProgressSummary } from '../services/videoLearningService';
import { CourseEnrollment, CourseWithContent, CourseWithTeacher, TeacherPublicStats, TeacherStats } from '../types/database';

function firstStats(stats?: TeacherPublicStats[] | TeacherPublicStats | TeacherStats[] | TeacherStats | null) {
  return Array.isArray(stats) ? stats[0] : stats;
}

function averageRating(stats?: TeacherPublicStats | TeacherStats | null) {
  if (!stats) return 0;
  return 'average_rating' in stats ? Number(stats.average_rating) : Number(stats.rating_average);
}

type HeroAction = {
  label: string;
  helper: string;
  onClick: () => void;
  tone?: 'default' | 'warning';
};

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile, session, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<CourseWithContent | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!courseId || authLoading) return;
    setLoading(true);
    setError('');
    Promise.all([getPublishedCourseById(courseId), getCourseAccess(courseId), getMyEnrollmentForCourse(courseId), getCourseProgressSummary(courseId)])
      .then(([courseData, access, enrollmentData, progressData]) => Promise.all([getPublicCourseContent(courseData as CourseWithTeacher), Promise.resolve(access), Promise.resolve(enrollmentData), Promise.resolve(progressData)]))
      .then(([content, access, enrollmentData, progressData]) => {
        setCourse(content);
        setHasAccess(access);
        setEnrollment(enrollmentData);
        setProgress(progressData?.started ? progressData.completedLessons + 1 : null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger le cours.'))
      .finally(() => setLoading(false));
  }, [authLoading, courseId, profile?.role, session?.user.id]);

  if (loading) return <LayoutAwareContainer><LoadingSpinner /></LayoutAwareContainer>;
  if (error || !course) return <LayoutAwareContainer><p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error || 'Cours introuvable.'}</p></LayoutAwareContainer>;

  const teacher = course.profiles;
  const stats = firstStats(teacher?.teacher_public_stats ?? teacher?.teacher_stats);
  const paid = Number(course.price) > 0;
  const price = paid ? money(Number(course.price), course.currency ?? 'TND') : 'Gratuit';
  const whatsapp = course.contact_whatsapp?.replace(/\D/g, '') || '';
  const approved = hasAccess || enrollment?.status === 'approved';
  const lessonCount = course.chapters.reduce((count, chapter) => count + chapter.videos.length, 0);

  const enroll = () => {
    setActionError('');
    if (!session) {
      navigate(`/login?redirect=/courses/${course.id}/enroll`, { state: { from: { pathname: `/courses/${course.id}/enroll` } } });
      return;
    }
    if (profile?.role !== 'student') {
      setActionError('Seuls les etudiants peuvent s inscrire a un cours.');
      return;
    }
    navigate(`/courses/${course.id}/enroll`);
  };

  const action: HeroAction = !paid
    ? { label: progress ? 'Continuer' : 'Commencer', helper: 'Acces gratuit immediat', onClick: () => navigate(`/courses/${course.id}/learn`) }
    : approved
      ? { label: progress ? 'Continuer le cours' : 'Acceder au cours', helper: 'Acces deja disponible', onClick: () => navigate(`/courses/${course.id}/learn`) }
      : enrollment?.status === 'pending'
        ? { label: 'Voir mon inscription', helper: 'Preuve de paiement en cours de validation', onClick: () => navigate('/student/enrollments') }
        : enrollment?.status === 'rejected'
          ? { label: 'Renvoyer une preuve', helper: enrollment.rejection_reason || 'Votre preuve doit etre corrigee.', onClick: () => navigate(`/courses/${course.id}/enroll`), tone: 'warning' }
          : { label: "S'inscrire", helper: 'Acces apres validation du paiement', onClick: enroll };

  const contactTeacher = whatsapp ? () => window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener,noreferrer') : undefined;
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: course.title, url: window.location.href }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
  };

  return (
    <LayoutAwareContainer className="mx-auto max-w-[1240px] space-y-7 pb-24 md:pb-8">
      <BackButton label="Retour aux cours" fallbackTo="/courses" />
      <CourseHero
        course={course}
        teacher={teacher}
        rating={averageRating(stats)}
        price={price}
        lessonCount={lessonCount}
        action={action}
        onContact={contactTeacher}
        onShare={() => void share()}
        externalUrl={course.course_link}
      />
      {actionError ? <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</p> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <CourseCurriculum course={course} hasFullAccess={approved || !paid} />
        <aside className="space-y-5 xl:sticky xl:top-24">
          <StudentLiveSessionsPanel courseId={course.id} hasAccess={Boolean(paid && profile?.role === 'student' && enrollment?.status === 'approved')} compact />
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-brand-navy">A propos du cours</h2>
              <ReportButton targetType="course" targetId={course.id} />
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <MetaLine label="Matiere" value={course.subject} />
              <MetaLine label="Niveau" value={course.level} />
              <MetaLine label="Format" value={formatLabel(course.format)} />
              {course.duration ? <MetaLine label="Duree" value={course.duration} /> : null}
            </dl>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-border bg-white p-3 shadow-xl md:hidden">
        <button type="button" onClick={action.onClick} className="w-full rounded-xl bg-brand-orange px-5 py-3.5 text-sm font-bold text-white">{action.label}</button>
      </div>
    </LayoutAwareContainer>
  );
}

function formatLabel(format: string) {
  const labels: Record<string, string> = { recorded: 'Enregistre', online: 'En ligne', hybrid: 'Hybride', onsite: 'Presentiel' };
  return labels[format] ?? format;
}

function CourseHero({ course, teacher, rating, price, lessonCount, action, onContact, onShare, externalUrl }: {
  course: CourseWithContent;
  teacher: CourseWithContent['profiles'];
  rating: number;
  price: string;
  lessonCount: number;
  action: HeroAction;
  onContact?: () => void;
  onShare: () => void;
  externalUrl?: string | null;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="order-2 p-5 sm:p-7 lg:order-1 lg:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black uppercase text-brand-orange">{course.subject}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-brand-navy">{course.level}</span>
          </div>
          <h1 className="mt-5 text-3xl font-black leading-tight text-brand-navy sm:text-4xl">{course.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{course.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <MetaPill icon={BookOpen} value={`${course.chapters.length} chapitre(s)`} />
            <MetaPill icon={BookOpen} value={`${lessonCount} lecon(s)`} />
            <MetaPill value={formatLabel(course.format)} />
          </div>
          {teacher ? (
            <Link to={`/teachers/${teacher.id}`} className="mt-7 inline-flex items-center gap-3 rounded-xl border border-brand-border bg-slate-50 p-3 transition hover:bg-white">
              <img src={teacher.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.full_name}`} alt="" className="h-11 w-11 rounded-xl object-cover" />
              <span className="pr-2">
                <span className="block text-sm font-bold text-brand-navy">{teacher.full_name}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">{teacher.specialty || 'Professeur'}{rating > 0 ? <><Star className="ml-2 h-3 w-3 fill-brand-orange text-brand-orange" />{rating.toFixed(1)}</> : null}</span>
              </span>
            </Link>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={action.onClick} className={`rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-sm transition ${action.tone === 'warning' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-orange hover:bg-orange-600'}`}>{action.label}</button>
            {onContact ? <button type="button" onClick={onContact} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border px-5 py-3.5 text-sm font-bold text-brand-navy hover:bg-slate-50"><MessageCircle className="h-4 w-4" />Contacter le prof</button> : null}
          </div>
          {externalUrl ? <a href={externalUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-navy hover:text-brand-orange">Ouvrir le lien du cours <ExternalLink className="h-4 w-4" /></a> : null}
          <p className="mt-3 text-xs font-semibold text-slate-500">{action.helper}</p>
        </div>
        <div className="relative order-1 bg-slate-50 p-4 sm:p-5 lg:order-2">
          <div className="absolute right-7 top-7 z-10 flex gap-2">
            {onContact ? <button type="button" onClick={onContact} aria-label="Contacter le professeur" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-navy shadow-sm hover:text-brand-orange"><MessageCircle className="h-4 w-4" /></button> : null}
            <button type="button" onClick={onShare} aria-label="Partager le cours" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-navy shadow-sm hover:text-brand-orange"><Share2 className="h-4 w-4" /></button>
          </div>
          {course.cover_url ? <img src={course.cover_url} alt={course.title} className="h-full min-h-64 w-full rounded-2xl object-cover lg:min-h-[430px]" /> : <div className="grid h-full min-h-64 place-items-center rounded-2xl bg-orange-50 p-8 text-center text-xl font-black text-brand-navy lg:min-h-[430px]">{course.subject}</div>}
          <span className="absolute bottom-8 left-8 rounded-xl bg-white px-4 py-2 text-lg font-black text-brand-navy shadow-sm">{price}</span>
        </div>
      </div>
    </section>
  );
}

function MetaPill({ icon: Icon, value }: { icon?: typeof BookOpen; value: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{Icon ? <Icon className="h-3.5 w-3.5 text-brand-orange" /> : null}{value}</span>;
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold text-brand-navy">{value}</dd></div>;
}
