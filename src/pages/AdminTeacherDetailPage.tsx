import { BookOpen, MessageSquare, Star, StickyNote, UserRound, Users } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TeacherStatusModal, { TeacherStatusModalAction } from '../components/admin/TeacherStatusModal';
import TeacherVerificationBadge, { teacherStatus } from '../components/admin/TeacherVerificationBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, money } from '../lib/utils';
import {
  addTeacherAdminNote,
  AdminTeacherSummary,
  blockTeacher,
  getAdminTeacherStats,
  getTeacherAdminNotes,
  getTeacherAnswers,
  getTeacherCourses,
  getTeacherEnrollments,
  getTeacherReviews,
  getTeacherVerificationDetails,
  getTeacherVerificationHistory,
  rejectTeacher,
  removeTeacherVerification,
  suspendTeacher,
  unsuspendTeacher,
  unblockTeacher,
  verifyTeacher,
} from '../services/adminTeachersService';
import {
  Answer,
  Course,
  CourseEnrollment,
  TeacherAdminNote,
  TeacherRating,
  TeacherVerificationDetails,
  TeacherVerificationHistory,
  TeacherVerificationStatus,
} from '../types/database';

export default function AdminTeacherDetailPage() {
  const { teacherId = '' } = useParams();
  const [teacher, setTeacher] = useState<AdminTeacherSummary | null>(null);
  const [details, setDetails] = useState<TeacherVerificationDetails | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [reviews, setReviews] = useState<TeacherRating[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [history, setHistory] = useState<TeacherVerificationHistory[]>([]);
  const [notes, setNotes] = useState<TeacherAdminNote[]>([]);
  const [note, setNote] = useState('');
  const [action, setAction] = useState<TeacherStatusModalAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await getAdminTeacherStats(teacherId);
      if (!summary) throw new Error('Prof introuvable.');
      const [nextDetails, nextCourses, nextAnswers, nextReviews, nextEnrollments, nextHistory, nextNotes] = await Promise.all([
        getTeacherVerificationDetails(teacherId),
        getTeacherCourses(teacherId),
        getTeacherAnswers(teacherId),
        getTeacherReviews(teacherId),
        getTeacherEnrollments(teacherId),
        getTeacherVerificationHistory(teacherId),
        getTeacherAdminNotes(teacherId),
      ]);
      setTeacher(summary); setDetails(nextDetails); setCourses(nextCourses); setAnswers(nextAnswers);
      setReviews(nextReviews); setEnrollments(nextEnrollments); setHistory(nextHistory); setNotes(nextNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le profil prof.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [teacherId]);

  const perform = async (status: TeacherVerificationStatus, reason: string) => {
    setBusy(true);
    try {
      if (status === 'verified') await verifyTeacher(teacherId);
      else if (status === 'rejected') await rejectTeacher(teacherId, reason);
      else if (status === 'suspended') await suspendTeacher(teacherId, reason);
      else if (status === 'blocked') await blockTeacher(teacherId, reason);
      else if (action === 'unblock') await unblockTeacher(teacherId);
      else if (action === 'unsuspend') await unsuspendTeacher(teacherId);
      else await removeTeacherVerification(teacherId, reason);
      setAction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await addTeacherAdminNote(teacherId, note.trim());
      setNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d ajouter la note.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du prof" />;
  if (!teacher) return <section className="space-y-5"><BackButton label="Retour aux profs" fallbackTo="/admin/teachers" /><p className="rounded-xl bg-red-50 p-5 text-red-700">{error || 'Prof introuvable.'}</p></section>;
  const status = teacherStatus(teacher);

  return (
    <section className="space-y-6">
      <BackButton label="Retour aux profs" fallbackTo="/admin/teachers" />
      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <header className="flex flex-col justify-between gap-5 rounded-2xl border border-brand-border bg-white p-6 shadow-sm xl:flex-row xl:items-start">
        <div className="flex gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-elios-sky text-elios-blue"><UserRound className="h-8 w-8" /></span>
          <div>
            <p className="text-xs font-black uppercase text-brand-orange">Dossier professeur</p>
            <h1 className="mt-1 text-3xl font-black text-elios-navy">{teacher.full_name}</h1>
            <p className="mt-1 text-slate-600">{teacher.email} - {teacher.specialty || 'Specialite non indiquee'}</p>
            <div className="mt-3 flex items-center gap-3"><TeacherVerificationBadge status={status} /><span className="text-sm text-slate-500">Inscrit le {formatDate(teacher.created_at)}</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/teachers/${teacher.id}`} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">Voir profil public</Link>
          {status !== 'verified' ? <button onClick={() => setAction('verify')} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Verifier</button> : <button onClick={() => setAction('remove')} className="rounded-xl border px-4 py-3 text-sm font-bold">Retirer verification</button>}
          <button onClick={() => setAction('reject')} className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-700">Refuser</button>
          {status === 'suspended' ? <button onClick={() => setAction('unsuspend')} className="rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700">Reactiver</button> : <button onClick={() => setAction('suspend')} className="rounded-xl border border-orange-200 px-4 py-3 text-sm font-bold text-orange-700">Suspendre</button>}
          {status === 'blocked' ? <button onClick={() => setAction('unblock')} className="rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700">Debloquer</button> : <button onClick={() => setAction('block')} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white">Bloquer</button>}
        </div>
      </header>

      {(details?.verification_rejected_reason || details?.suspension_reason || details?.blocked_reason || teacher.blocked_reason) ? (
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-black">Motif interne actuel</p>
          <p className="mt-1">{details?.verification_rejected_reason || details?.suspension_reason || details?.blocked_reason || teacher.blocked_reason}</p>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Note moyenne" value={Number(teacher.average_rating).toFixed(1)} icon={<Star />} />
        <Stat label="Avis" value={teacher.total_reviews} icon={<Star />} />
        <Stat label="Reponses" value={teacher.total_answers} icon={<MessageSquare />} />
        <Stat label="Meilleures" value={teacher.total_best_answers} icon={<MessageSquare />} />
        <Stat label="Cours" value={teacher.total_courses} icon={<BookOpen />} />
        <Stat label="Abonnes" value={teacher.follower_count ?? 0} icon={<Users />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Panel title="Profil">
            <p className="text-sm leading-6 text-slate-600">{teacher.bio || 'Aucune biographie.'}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Specialite" value={teacher.specialty} /><Info label="Experience" value={teacher.experience} />
              <Info label="Formation" value={teacher.education} /><Info label="Langues" value={teacher.languages?.join(', ')} />
            </dl>
          </Panel>
          <Panel title={`Cours (${courses.length})`}>
            {courses.map((course) => <div key={course.id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row"><div><p className="font-bold text-elios-navy">{course.title}</p><p className="text-sm text-slate-500">{course.subject} - {money(course.price, course.currency)} - {course.is_published ? 'Publie' : 'Brouillon'}</p></div><Link to={`/courses/${course.id}`} className="text-sm font-bold text-elios-blue">Voir</Link></div>)}
            {!courses.length ? <Empty text="Aucun cours." /> : null}
          </Panel>
          <Panel title={`Reponses (${answers.length})`}>
            {answers.slice(0, 10).map((answer) => <div key={answer.id} className="rounded-xl border border-slate-100 p-4"><p className="line-clamp-2 text-sm text-slate-700">{answer.content}</p><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{answer.is_best ? 'Meilleure reponse' : 'Reponse'}</span><Link to={`/questions/${answer.question_id}`} className="font-bold text-elios-blue">Ouvrir</Link></div></div>)}
            {!answers.length ? <Empty text="Aucune reponse." /> : null}
          </Panel>
          <Panel title={`Avis (${reviews.length})`}>
            {reviews.slice(0, 10).map((review) => <div key={review.id} className="rounded-xl border border-slate-100 p-4 text-sm"><p className="font-bold text-elios-navy">{review.rating}/5</p><p className="mt-1 text-slate-600">{review.review || 'Aucun commentaire.'}</p><p className="mt-2 text-xs text-slate-400">{formatDate(review.created_at)}</p></div>)}
            {!reviews.length ? <Empty text="Aucun avis." /> : null}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title={`Inscriptions (${enrollments.length})`}>
            <p className="text-sm text-slate-600">{enrollments.filter((item) => item.status === 'approved').length} approuvees - {enrollments.filter((item) => item.status === 'pending').length} en attente</p>
          </Panel>
          <Panel title="Note admin" icon={<StickyNote className="h-5 w-5 text-brand-orange" />}>
            <form onSubmit={submitNote}><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Visible uniquement par les admins" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-orange" /><button disabled={busy || !note.trim()} className="mt-3 w-full rounded-xl bg-elios-navy px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Ajouter la note</button></form>
            {notes.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p>{item.note}</p><p className="mt-2 text-xs text-slate-500">{item.admin?.full_name ?? 'Admin'} - {formatDate(item.created_at)}</p></div>)}
          </Panel>
          <Panel title="Historique de verification">
            {history.map((item) => <div key={item.id} className="border-l-2 border-orange-200 pb-4 pl-4 text-sm last:pb-0"><p className="font-bold text-elios-navy">{item.action}</p><p className="text-slate-500">{item.previous_status || '-'} vers {item.new_status || '-'}</p>{item.reason ? <p className="mt-1 text-slate-600">{item.reason}</p> : null}<p className="mt-1 text-xs text-slate-400">{formatDate(item.created_at)} - {item.admin?.full_name ?? 'Admin'}</p></div>)}
            {!history.length ? <Empty text="Aucun historique." /> : null}
          </Panel>
        </div>
      </div>
      <TeacherStatusModal action={action} open={Boolean(action)} busy={busy} teacherName={teacher.full_name} onClose={() => setAction(null)} onConfirm={perform} />
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="space-y-3 rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><h2 className="text-lg font-black text-elios-navy">{title}</h2>{icon}</div>{children}</section>;
}
function Stat({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return <article className="rounded-xl border border-brand-border bg-white p-4 shadow-sm"><span className="block h-5 w-5 text-brand-orange">{icon}</span><p className="mt-3 text-2xl font-black text-elios-navy">{value}</p><p className="text-sm text-slate-500">{label}</p></article>;
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="font-bold text-elios-navy">{label}</dt><dd className="mt-1 text-slate-600">{value || 'Non indique'}</dd></div>;
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">{text}</p>;
}
