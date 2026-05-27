import { BookOpen, CreditCard, FileText, FileVideo, Star, UserRound, WalletCards } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CourseAdminActionModal from '../components/admin/CourseAdminActionModal';
import CourseAdminBadges from '../components/admin/CourseAdminBadges';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LiveSessionCard from '../components/live/LiveSessionCard';
import LiveSessionCohostDiagnostics from '../components/live/LiveSessionCohostDiagnostics';
import LiveSessionCohostStatus from '../components/live/LiveSessionCohostStatus';
import LiveSessionMeetSetupBadges from '../components/live/LiveSessionMeetSetupBadges';
import DeleteLiveSessionModal from '../components/live/DeleteLiveSessionModal';
import ActionDialog from '../components/ui/ActionDialog';
import { formatDate, money } from '../lib/utils';
import {
  AdminCourseSummary,
  CourseAdminAction,
  getAdminCourseById,
  getAdminCourseContent,
  getCourseAdminActions,
  getCourseEnrollments,
  manageCourse,
} from '../services/adminCoursesService';
import { cancelGoogleMeetLiveSession, deleteGoogleMeetLiveSession, getTeacherCourseLiveSessions, retryGoogleMeetCohost } from '../services/liveSessionsService';
import { getLiveSessionStatus } from '../services/liveSessionsCalendarService';
import { AdminAuditLog, CourseEnrollmentWithCourse, CourseWithContent } from '../types/database';
import { LiveSession } from '../types/liveSessions';

export default function AdminCourseDetailPage() {
  const { courseId = '' } = useParams();
  const [course, setCourse] = useState<AdminCourseSummary | null>(null);
  const [content, setContent] = useState<CourseWithContent | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [history, setHistory] = useState<AdminAuditLog[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeAction, setActiveAction] = useState<CourseAdminAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingLiveSession, setDeletingLiveSession] = useState<LiveSession | null>(null);
  const [cancellingLiveSession, setCancellingLiveSession] = useState<LiveSession | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCourse, nextContent, nextEnrollments, nextHistory, nextLiveSessions] = await Promise.all([
        getAdminCourseById(courseId), getAdminCourseContent(courseId), getCourseEnrollments(courseId), getCourseAdminActions(courseId), getTeacherCourseLiveSessions(courseId),
      ]);
      setCourse(nextCourse); setContent(nextContent); setEnrollments(nextEnrollments); setHistory(nextHistory);
      setLiveSessions(nextLiveSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le cours.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [courseId]);

  const act = async (reason: string) => {
    if (!activeAction) return;
    setBusy(true);
    try {
      await manageCourse(courseId, activeAction, reason);
      setNotice('Décision enregistrée dans l’historique admin.');
      setActiveAction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  const cancelLiveSession = async (reason: string) => {
    if (!cancellingLiveSession) return;
    try {
      await cancelGoogleMeetLiveSession(cancellingLiveSession.id, reason);
      setNotice('Session live annulee.');
      setCancellingLiveSession(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'annuler la session.");
    }
  };
  const retryCohost = async (session: LiveSession) => {
    try {
      await retryGoogleMeetCohost(session.id);
      setNotice('Nouvelle tentative co-host enregistrée.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de réessayer le co-host.');
    }
  };
  const deleteLiveSession = async (reason?: string) => {
    if (!deletingLiveSession) return;
    setBusy(true);
    setError('');
    try {
      await deleteGoogleMeetLiveSession(deletingLiveSession.id, reason);
      setNotice('Session supprimée.');
      setDeletingLiveSession(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer la session.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du cours" />;
  if (!course) return <section className="space-y-5"><BackButton label="Retour aux cours" fallbackTo="/admin/courses" /><p className="rounded-xl bg-red-50 p-5 text-sm text-red-700">Ce cours est introuvable.</p></section>;
  const approved = enrollments.filter((item) => item.status === 'approved').length;
  const pending = enrollments.filter((item) => item.status === 'pending').length;
  const rejected = enrollments.filter((item) => item.status === 'rejected').length;

  return (
    <section className="space-y-6">
      <BackButton label="Retour à la gestion des cours" fallbackTo="/admin/courses" />
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
      <header className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="min-h-48 bg-elios-sky">{course.cover_url ? <img src={course.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-brand-navy">{course.subject}</div>}</div>
          <div className="p-6">
            <CourseAdminBadges course={course} />
            <h1 className="mt-4 text-3xl font-black text-brand-navy">{course.title}</h1>
            <p className="mt-2 text-slate-600">{course.subjectRecord?.name || course.subject} · {course.level} · {money(Number(course.price), course.currency)}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setActiveAction(course.is_published ? 'unpublish' : 'publish')} className="rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white">{course.is_published ? 'Dépublier' : 'Publier'}</button>
              <button onClick={() => setActiveAction(course.is_hidden ? 'unhide' : 'hide')} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">{course.is_hidden ? 'Restaurer' : 'Masquer'}</button>
              <button onClick={() => setActiveAction(course.is_featured ? 'unfeature' : 'feature')} className="rounded-xl border border-orange-100 px-4 py-3 text-sm font-bold text-brand-orange">{course.is_featured ? 'Retirer de la une' : 'Mettre en avant'}</button>
              <button onClick={() => setActiveAction('approve')} className="rounded-xl border border-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700">Approuver</button>
              <button onClick={() => setActiveAction('request_changes')} className="rounded-xl border border-orange-100 px-4 py-3 text-sm font-bold text-orange-700">Modifications</button>
              <button onClick={() => setActiveAction('reject')} className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-700">Refuser</button>
              <button onClick={() => setActiveAction(course.is_deleted ? 'restore' : 'delete')} className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-700">{course.is_deleted ? 'Restaurer' : 'Supprimer'}</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
              {!course.is_hidden && !course.is_deleted && course.is_published ? <Link to={`/courses/${course.id}`} className="text-brand-navy">Ouvrir le cours public</Link> : null}
              <Link to={`/admin/courses/${course.id}/content`} className="text-brand-orange">Inspecter le contenu</Link>
              <Link to={`/admin/teachers/${course.teacher_id}`} className="text-brand-navy">Voir le prof</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Chapitres" value={course.chaptersCount} icon={<BookOpen />} />
        <Metric label="Vidéos" value={course.videosCount} icon={<FileVideo />} />
        <Metric label="Fichiers" value={course.attachmentsCount} icon={<FileText />} />
        <Metric label="Approuvées" value={approved} icon={<CreditCard />} />
        <Metric label="En attente" value={pending} icon={<CreditCard />} />
        <Metric label="Refusées" value={rejected} icon={<CreditCard />} />
        <Metric label="Revenus estimés" value={money(course.estimatedRevenue, course.currency)} icon={<WalletCards />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Panel title="Présentation du cours">
            <p className="text-sm leading-7 text-slate-600">{course.description}</p>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Niveau" value={course.level} /><Info label="Durée" value={course.duration} />
              <Info label="Format" value={course.format} /><Info label="Créé le" value={formatDate(course.created_at)} />
              <Info label="Contact WhatsApp" value={course.contact_whatsapp} /><Info label="Mode de paiement" value={course.payment_method} />
            </dl>
            {course.payment_instructions ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-bold text-brand-navy">Instructions de paiement</p><p className="mt-2">{course.payment_instructions}</p></div> : null}
            {course.admin_review_note ? <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900"><p className="font-bold">Note de contrôle</p><p className="mt-2">{course.admin_review_note}</p></div> : null}
          </Panel>

          <Panel title="Aperçu des chapitres">
            {content?.chapters.length ? content.chapters.map((chapter) => (
              <div key={chapter.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold text-brand-navy">Chapitre {chapter.chapter_order} · {chapter.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{chapter.videos.length} vidéos · {chapter.attachments.length} fichiers {chapter.is_free_preview ? '· Aperçu gratuit' : ''}</p>
                </div>
                <Link to={`/admin/courses/${course.id}/content`} className="text-sm font-bold text-brand-orange">Voir contenu</Link>
              </div>
            )) : <Empty text="Aucun chapitre." />}
          </Panel>

          <Panel title="Inscriptions récentes">
            {enrollments.slice(0, 8).map((enrollment) => (
              <div key={enrollment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                <div><p className="font-bold text-brand-navy">{enrollment.student?.full_name || 'Étudiant'}</p><p className="text-xs text-slate-500">{formatDate(enrollment.created_at)}</p></div>
                <EnrollmentStatusBadge status={enrollment.status} />
                {enrollment.payment_proof_url ? <a href={enrollment.payment_proof_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-navy">Preuve</a> : null}
              </div>
            ))}
            {!enrollments.length ? <Empty text="Aucune inscription." /> : <Link to="/admin/enrollments" className="inline-flex text-sm font-bold text-brand-orange">Voir toutes les inscriptions</Link>}
          </Panel>
          <Panel title="Sessions live Google Meet">
            {liveSessions.length ? liveSessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                canJoin
                controls={<>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <LiveSessionCohostStatus status={session.teacher_cohost_status} />
                    {session.teacher_cohost_email ? <span className="text-xs text-slate-500">{session.teacher_cohost_email}</span> : null}
                  </div>
                  <LiveSessionMeetSetupBadges session={session} />
                  <p className="w-full text-xs leading-5 text-slate-500">L'enregistrement dépend aussi du plan Google Workspace et du paramètre Recording du compte organisateur.</p>
                  <LiveSessionCohostDiagnostics session={session} />
                  {session.teacher_cohost_status === 'failed' || session.teacher_cohost_status === 'unsupported' ? (
                    <button type="button" onClick={() => void retryCohost(session)} className="rounded-xl border border-orange-100 px-4 py-3 text-sm font-bold text-brand-orange">Réessayer co-host</button>
                  ) : null}
                  {getLiveSessionStatus(session) !== 'cancelled' ? (
                    <button type="button" onClick={() => setCancellingLiveSession(session)} className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-700">Annuler</button>
                  ) : null}
                  <button type="button" onClick={() => setDeletingLiveSession(session)} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700">Supprimer la session</button>
                </>}
              />
            )) : <Empty text="Aucune session live." />}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Prof propriétaire">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-elios-sky text-brand-navy"><UserRound /></span>
              <div><p className="font-bold text-brand-navy">{course.teacher?.full_name || 'Prof'}</p><p className="text-sm text-slate-500">{course.teacher?.email}</p></div>
            </div>
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600"><Star className="h-4 w-4 text-brand-orange" /> Statut : {course.teacher?.verification_status || 'pending'}</p>
            <Link to={`/admin/teachers/${course.teacher_id}`} className="inline-flex rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white">Voir dossier prof</Link>
          </Panel>
          <Panel title="Historique admin">
            {history.map((entry) => {
              const details = entry.details as { reason?: string } | null;
              return <div key={entry.id} className="border-l-2 border-orange-200 pb-4 pl-4 text-sm last:pb-0"><p className="font-bold text-brand-navy">{entry.action}</p>{details?.reason ? <p className="mt-1 text-slate-600">{details.reason}</p> : null}<p className="mt-1 text-xs text-slate-400">{formatDate(entry.created_at)}</p></div>;
            })}
            {!history.length ? <Empty text="Aucune action admin." /> : null}
          </Panel>
        </div>
      </div>
      {activeAction ? <CourseAdminActionModal open courseTitle={course.title} action={activeAction} busy={busy} onClose={() => setActiveAction(null)} onConfirm={act} /> : null}
      <DeleteLiveSessionModal
        session={deletingLiveSession ? {
          title: deletingLiveSession.title,
          status: getLiveSessionStatus(deletingLiveSession),
          hasRecording: Boolean(deletingLiveSession.recording_url),
          courseTitle: course.title,
          teacherName: course.teacher?.full_name,
        } : null}
        saving={busy}
        error={error}
        adminContext
        onClose={() => setDeletingLiveSession(null)}
        onConfirm={(reason) => void deleteLiveSession(reason)}
      />
      <ActionDialog open={Boolean(cancellingLiveSession)} title="Annuler cette session live ?" fieldLabel="Motif de l’annulation" confirmLabel="Annuler la session" danger resetKey={cancellingLiveSession?.id} onClose={() => setCancellingLiveSession(null)} onConfirm={cancelLiveSession} />
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-brand-navy">{title}</h2>{children}</section>;
}
function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return <article className="rounded-xl border border-brand-border bg-white p-4 shadow-sm"><span className="block h-5 w-5 text-brand-orange">{icon}</span><p className="mt-3 text-xl font-black text-brand-navy">{value}</p><p className="text-xs text-slate-500">{label}</p></article>;
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="font-bold text-brand-navy">{label}</dt><dd className="mt-1 capitalize text-slate-600">{value || 'Non indiqué'}</dd></div>;
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">{text}</p>;
}
