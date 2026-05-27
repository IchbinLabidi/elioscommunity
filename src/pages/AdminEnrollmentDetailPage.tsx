import { ArrowLeft, BookOpen, CreditCard, FileText, UserRound } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminEnrollmentActionModal from '../components/admin/AdminEnrollmentActionModal';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, money } from '../lib/utils';
import { AdminEnrollmentAction, getAdminEnrollmentById, getEnrollmentActions, manageEnrollment } from '../services/adminEnrollmentsService';
import { CourseEnrollmentWithCourse, EnrollmentAction } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { draftKey } from '../hooks/useFormDraft';

export default function AdminEnrollmentDetailPage() {
  const { profile } = useAuth();
  const { enrollmentId = '' } = useParams();
  const [enrollment, setEnrollment] = useState<CourseEnrollmentWithCourse | null>(null);
  const [history, setHistory] = useState<EnrollmentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<AdminEnrollmentAction | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [row, actions] = await Promise.all([getAdminEnrollmentById(enrollmentId), getEnrollmentActions(enrollmentId)]);
      setEnrollment(row);
      setHistory(actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'inscription.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [enrollmentId]);
  const perform = async (reason: string, note: string) => {
    if (!action) return false;
    setBusy(true);
    try {
      const result = await manageEnrollment(enrollmentId, action, reason, note);
      setAction(null);
      setNotice(result.message);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'action n'a pas pu etre effectuee.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <LoadingSpinner label="Chargement de l'inscription" />;
  if (!enrollment) return <section className="space-y-5"><Link to="/admin/enrollments" className="inline-flex items-center gap-2 font-bold text-brand-navy"><ArrowLeft className="h-4 w-4" />Retour aux inscriptions</Link><p className="rounded-xl bg-red-50 p-5 text-red-700">Inscription introuvable.</p></section>;
  const proofIsImage = Boolean(enrollment.payment_proof_path?.match(/\.(png|jpe?g|webp)$/i));
  const latestAdminNote = history.find((entry) => entry.note)?.note;
  return (
    <section className="space-y-6">
      <Link to="/admin/enrollments" className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy"><ArrowLeft className="h-4 w-4" />Retour aux inscriptions</Link>
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
      <header className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-3"><EnrollmentStatusBadge status={enrollment.status} /><span className="text-xs text-slate-400">Soumise le {formatDate(enrollment.submitted_at ?? enrollment.created_at)}</span></div>
            <h1 className="mt-4 text-3xl font-black text-brand-navy">Inscription au cours</h1>
            <p className="mt-2 text-slate-600">{enrollment.student?.full_name} · {enrollment.courses?.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {enrollment.status !== 'approved' ? <button onClick={() => setAction('approve')} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Approuver</button> : null}
            {enrollment.status !== 'approved' ? <button onClick={() => setAction('grant')} className="rounded-xl border border-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700">Accorder manuellement</button> : null}
            {enrollment.status !== 'rejected' ? <button onClick={() => setAction('reject')} className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-700">Refuser</button> : null}
            {enrollment.status !== 'pending' ? <button onClick={() => setAction('reset')} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Remettre en attente</button> : null}
            {enrollment.status === 'approved' ? <button onClick={() => setAction('remove_access')} className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-700">Retirer l'acces</button> : <button onClick={() => setAction('cancel')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Annuler</button>}
            <button onClick={() => setAction('note')} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Note admin</button>
          </div>
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <Panel title="Preuve de paiement" icon={<FileText />}>
            {enrollment.payment_proof_url ? <>
              {proofIsImage ? <img src={enrollment.payment_proof_url} alt="Preuve de paiement" className="max-h-[460px] w-full rounded-xl border border-brand-border object-contain" /> : <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Document de paiement disponible en consultation securisee.</div>}
              <a href={enrollment.payment_proof_url} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white">Ouvrir la preuve</a>
            </> : <p className="rounded-xl border border-dashed border-brand-border p-6 text-center text-slate-500">{enrollment.payment_proof_error || 'Aucune preuve de paiement envoyée.'}</p>}
            {enrollment.payment_note ? <Info label="Message de l'etudiant" value={enrollment.payment_note} /> : null}
          </Panel>
          <Panel title="Decision" icon={<CreditCard />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Statut" value={enrollment.status} />
              <Info label="Examine par" value={enrollment.reviewer?.full_name} />
              <Info label="Approuvee le" value={enrollment.approved_at ? formatDate(enrollment.approved_at) : null} />
              <Info label="Refusee le" value={enrollment.rejected_at ? formatDate(enrollment.rejected_at) : null} />
            </div>
            {enrollment.rejection_reason ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700"><strong>Motif :</strong> {enrollment.rejection_reason}</div> : null}
            {latestAdminNote ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><strong className="text-brand-navy">Note admin :</strong> {latestAdminNote}</div> : null}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Etudiant" icon={<UserRound />}>
            <p className="font-bold text-brand-navy">{enrollment.student?.full_name ?? 'Etudiant'}</p>
            <p className="text-sm text-slate-500">{enrollment.student?.email}</p>
            <Link to={`/admin/students/${enrollment.student_id}`} className="inline-flex rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Voir le profil</Link>
          </Panel>
          <Panel title="Cours" icon={<BookOpen />}>
            <p className="font-bold text-brand-navy">{enrollment.courses?.title ?? 'Cours'}</p>
            <p className="text-sm text-slate-500">{enrollment.courses?.subject} · {money(Number(enrollment.courses?.price ?? 0), enrollment.courses?.currency ?? 'TND')}</p>
            <p className="text-sm text-slate-500">Prof : {enrollment.teacher?.full_name ?? 'Non indique'}</p>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/courses/${enrollment.course_id}`} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Voir cours</Link>
              <Link to={`/admin/teachers/${enrollment.teacher_id}`} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Voir prof</Link>
            </div>
          </Panel>
          <Panel title="Historique" icon={<CreditCard />}>
            {history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-orange-200 pb-4 pl-4 text-sm last:pb-0">
                <p className="font-bold capitalize text-brand-navy">{entry.action.replace(/_/g, ' ')}</p>
                {entry.reason ? <p className="mt-1 text-slate-600">{entry.reason}</p> : null}
                {entry.note ? <p className="mt-1 text-slate-500">{entry.note}</p> : null}
                <p className="mt-1 text-xs text-slate-400">{entry.admin?.full_name ? `${entry.admin.full_name} · ` : ''}{formatDate(entry.created_at)}</p>
              </div>
            ))}
            {!history.length ? <p className="text-sm text-slate-500">Aucune action enregistree.</p> : null}
          </Panel>
        </div>
      </div>
      <AdminEnrollmentActionModal open={Boolean(action)} action={action} studentName={enrollment.student?.full_name ?? 'Etudiant'} busy={busy} draftKey={draftKey(profile?.id, `admin:enrollment:${enrollmentId}`)} onClose={() => setAction(null)} onConfirm={perform} />
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-black text-brand-navy"><span className="text-brand-orange">{icon}</span>{title}</h2>{children}</section>;
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-brand-navy">{value || 'Non indique'}</p></div>;
}
