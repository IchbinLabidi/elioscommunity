import { AlertTriangle, BookOpen, CreditCard, Eye, EyeOff, FileVideo, FolderOpen, ShieldCheck, Star, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminSectionHeader from '../components/admin/AdminSectionHeader';
import AdminStatCard from '../components/admin/AdminStatCard';
import CourseAdminActionModal from '../components/admin/CourseAdminActionModal';
import CourseAdminBadges from '../components/admin/CourseAdminBadges';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, money } from '../lib/utils';
import {
  AdminCourseFilters,
  AdminCourseStats,
  AdminCourseSummary,
  CourseAdminAction,
  getAdminCourses,
  getAdminCourseStats,
  manageCourse,
} from '../services/adminCoursesService';

export default function AdminCoursesPage() {
  const [params] = useSearchParams();
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [stats, setStats] = useState<AdminCourseStats | null>(null);
  const [filters, setFilters] = useState<AdminCourseFilters>({
    status: (params.get('status') as AdminCourseFilters['status']) || 'all',
    sort: 'newest',
    price: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState<{ course: AdminCourseSummary; action: CourseAdminAction } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedStatus = (params.get('status') as AdminCourseFilters['status']) || 'all';
    setFilters((current) => ({ ...current, status: requestedStatus }));
  }, [params]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, nextStats] = await Promise.all([getAdminCourses(filters), getAdminCourseStats()]);
      setCourses(rows);
      setStats(nextStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les cours.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [filters]);

  const options = useMemo(() => ({
    subjects: Array.from(new Map(courses.map((course) => [course.subject_id || course.subject, { id: course.subject_id || course.subject, name: course.subjectRecord?.name || course.subject }])).values()),
    teachers: Array.from(new Map(courses.map((course) => [course.teacher_id, { id: course.teacher_id, name: course.teacher?.full_name || 'Prof' }])).values()),
  }), [courses]);
  const filtersActive = Boolean(filters.query || filters.subject || filters.teacherId || filters.status !== 'all' || filters.price || filters.sort !== 'newest');

  const action = async (reason: string) => {
    if (!active) return;
    setBusy(true);
    setError('');
    try {
      await manageCourse(active.course.id, active.action, reason);
      setNotice('Action enregistrée avec succès.');
      setActive(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <BackButton label="Retour au tableau de bord" fallbackTo="/admin/dashboard" />
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Administration</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Gestion des cours</h1>
        <p className="mt-2 text-slate-600">Contrôlez les cours publiés, la qualité des contenus et les accès étudiants.</p>
      </header>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard label="Total cours" value={stats.total} icon={BookOpen} />
          <AdminStatCard label="Cours publiés" value={stats.published} icon={Eye} />
          <AdminStatCard label="Brouillons" value={stats.drafts} icon={EyeOff} />
          <AdminStatCard label="Masqués" value={stats.hidden} icon={EyeOff} />
          <AdminStatCard label="Mis en avant" value={stats.featured} icon={Star} />
          <AdminStatCard label="En attente de validation" value={stats.pendingReview} icon={ShieldCheck} />
          <AdminStatCard label="Cours payants" value={stats.paid} icon={WalletCards} />
          <AdminStatCard label="Cours gratuits" value={stats.free} icon={BookOpen} />
          <AdminStatCard label="Inscriptions" value={stats.totalEnrollments} icon={CreditCard} />
          <AdminStatCard label="Inscriptions en attente" value={stats.pendingEnrollments} icon={CreditCard} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <AdminSectionHeader title="Rechercher et filtrer" subtitle="Retrouvez un cours par professeur, matière ou statut de contrôle." />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input value={filters.query ?? ''} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Titre, description ou prof" className="min-h-12 rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange xl:col-span-2" />
          <select value={filters.subject ?? ''} onChange={(event) => setFilters((current) => ({ ...current, subject: event.target.value }))} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm">
            <option value="">Toutes les matières</option>
            {options.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <select value={filters.teacherId ?? ''} onChange={(event) => setFilters((current) => ({ ...current, teacherId: event.target.value }))} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm">
            <option value="">Tous les profs</option>
            {options.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
          <select value={filters.status ?? 'all'} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AdminCourseFilters['status'] }))} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm">
            <option value="all">Tous les statuts</option><option value="published">Publiés</option><option value="draft">Brouillons</option><option value="hidden">Masqués</option><option value="featured">Mis en avant</option><option value="pending">En attente</option><option value="approved">Approuvés</option><option value="needs_changes">Modifications demandées</option><option value="rejected">Refusés</option>
          </select>
          <select value={filters.price ?? ''} onChange={(event) => setFilters((current) => ({ ...current, price: event.target.value as AdminCourseFilters['price'] }))} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm">
            <option value="">Tous les prix</option><option value="free">Gratuits</option><option value="paid">Payants</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <select value={filters.sort ?? 'newest'} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as AdminCourseFilters['sort'] }))} className="min-h-11 rounded-xl border border-brand-border px-3 text-sm">
            <option value="newest">Plus récents</option><option value="oldest">Plus anciens</option><option value="most-enrollments">Plus d’inscriptions</option><option value="highest-price">Prix le plus élevé</option><option value="pending-first">À valider d’abord</option>
          </select>
          {filtersActive ? <button onClick={() => setFilters({ status: 'all', sort: 'newest', price: '' })} className="rounded-xl border border-brand-border px-4 py-2 text-sm font-bold text-brand-navy">Réinitialiser les filtres</button> : null}
        </div>
      </section>

      {notice ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <ErrorCard onRetry={() => void load()} /> : null}
      {loading ? <LoadingSpinner label="Chargement des cours" /> : courses.length ? (
        <div className="space-y-4">
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} onAction={(nextAction) => setActive({ course, action: nextAction })} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-brand-orange" />
          <h2 className="mt-3 text-lg font-black text-brand-navy">{filtersActive ? 'Aucun cours ne correspond à vos filtres.' : 'Aucun cours trouvé.'}</h2>
        </div>
      )}
      {active ? <CourseAdminActionModal open action={active.action} courseTitle={active.course.title} busy={busy} onClose={() => setActive(null)} onConfirm={action} /> : null}
    </section>
  );
}

function CourseRow({ course, onAction }: { course: AdminCourseSummary; onAction: (action: CourseAdminAction) => void }) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-elios-sky xl:w-44">
          {course.cover_url ? <img src={course.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-bold text-brand-navy">{course.subject}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <CourseAdminBadges course={course} />
          <h2 className="mt-3 text-xl font-black text-brand-navy">{course.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{course.subjectRecord?.name || course.subject} · {course.teacher?.full_name || 'Prof'} · {money(Number(course.price), course.currency)}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />{course.chaptersCount} chapitres</span>
            <span className="inline-flex items-center gap-1"><FileVideo className="h-3.5 w-3.5" />{course.videosCount} vidéos</span>
            <span>{course.attachmentsCount} fichiers</span><span>{course.enrollmentsCount} inscriptions</span>
            {course.reportsCount ? <span className="text-red-700">{course.reportsCount} report(s)</span> : null}
            <span>Créé le {formatDate(course.created_at)}</span>
          </div>
        </div>
        <div className="flex max-w-md flex-wrap gap-2 xl:justify-end">
          <Link to={`/admin/courses/${course.id}`} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Détails</Link>
          <Link to={`/admin/courses/${course.id}/content`} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Contenu</Link>
          <button onClick={() => onAction(course.is_published ? 'unpublish' : 'publish')} className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white">{course.is_published ? 'Dépublier' : 'Publier'}</button>
          <button onClick={() => onAction(course.is_hidden ? 'unhide' : 'hide')} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">{course.is_hidden ? 'Restaurer' : 'Masquer'}</button>
          <button onClick={() => onAction(course.is_featured ? 'unfeature' : 'feature')} className="rounded-xl border border-orange-100 px-3 py-2 text-sm font-bold text-brand-orange">{course.is_featured ? 'Retirer de la une' : 'Mettre en avant'}</button>
          {(course.admin_review_status ?? 'pending') !== 'approved' ? <button onClick={() => onAction('approve')} className="rounded-xl border border-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">Approuver</button> : null}
          <button onClick={() => onAction('request_changes')} className="rounded-xl border border-orange-100 px-3 py-2 text-sm font-bold text-orange-700">Modifications</button>
          <button onClick={() => onAction('reject')} className="rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Refuser</button>
          {!course.is_deleted ? <button onClick={() => onAction('delete')} className="rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Supprimer</button> : <button onClick={() => onAction('restore')} className="rounded-xl border border-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">Restaurer</button>}
        </div>
      </div>
    </article>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-white p-5"><p className="inline-flex items-center gap-2 text-sm font-bold text-red-700"><AlertTriangle className="h-5 w-5" />Impossible de charger les cours.</p><button onClick={onRetry} className="rounded-xl bg-brand-navy px-4 py-2 text-sm font-bold text-white">Réessayer</button></div>;
}
