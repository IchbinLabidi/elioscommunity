import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EnrollmentReviewActions from '../components/EnrollmentReviewActions';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';
import { getTeacherEnrollmentRequests, reviewEnrollment } from '../services/enrollmentsService';
import { CourseEnrollmentWithCourse, EnrollmentStatus } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';

export default function TeacherEnrollmentRequestsPage() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<CourseEnrollmentWithCourse[]>([]);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejecting, setRejecting] = useState<CourseEnrollmentWithCourse | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const rejectionDraft = useFormDraft({
    key: draftKey(profile?.id, `teacher:reject-enrollment:${rejecting?.id ?? 'none'}`),
    values: { reason: rejectionReason },
    onRestore: (values) => setRejectionReason(values.reason),
    enabled: Boolean(rejecting),
  });

  const load = () => {
    setLoading(true);
    getTeacherEnrollmentRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les demandes d'inscription."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => setStatus(searchParams.get('status') ?? ''), [searchParams]);
  const filtered = useMemo(() => requests.filter((request) => !status || request.status === status), [requests, status]);

  const review = async (request: CourseEnrollmentWithCourse, nextStatus: Extract<EnrollmentStatus, 'approved' | 'rejected'>, reason = '') => {
    setBusyId(request.id);
    setError('');
    setNotice('');
    try {
      const result = await reviewEnrollment(request.id, nextStatus, reason);
      if (nextStatus === 'rejected') {
        rejectionDraft.clearDraft();
        setRejecting(null);
        setRejectionReason('');
      }
      setNotice(result.message);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de traiter cette demande d'inscription.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5">
      <BackButton
        label="Retour au tableau de bord"
        fallbackTo={profile?.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard'}
      />
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">Demandes d'inscription</h1>
        <p className="mt-2 text-slate-600">Validez les étudiants après vérification de leur preuve de paiement.</p>
      </div>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3">
        <option value="">Tous les statuts</option>
        <option value="pending">En attente</option>
        <option value="approved">Approuvées</option>
        <option value="rejected">Rejetées</option>
      </select>
      {notice ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {filtered.map((request) => (
            <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-bold text-elios-navy">{request.courses?.title || 'Cours'}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.student?.full_name || 'Étudiant'} - {formatDate(request.created_at)}</p>
                  {request.payment_note ? <p className="mt-2 text-sm text-slate-600">{request.payment_note}</p> : null}
                  {request.rejection_reason ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{request.rejection_reason}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EnrollmentStatusBadge status={request.status} />
                  {request.payment_proof_url ? <a href={request.payment_proof_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue">Voir preuve</a> : <span className="text-sm text-slate-500">{request.payment_proof_error || 'Preuve manquante'}</span>}
                  {request.status === 'pending' ? <EnrollmentReviewActions disabled={busyId === request.id} onApprove={() => review(request, 'approved')} onReject={() => { setRejectionReason(''); setRejecting(request); }} /> : null}
                </div>
              </div>
            </article>
          ))}
          {!filtered.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">Aucune demande d'inscription trouvée.</p> : null}
        </div>
      )}
      {rejecting ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/45 p-4">
          <form onSubmit={(event) => { event.preventDefault(); void review(rejecting, 'rejected', rejectionReason.trim()); }} className="w-full max-w-lg rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-brand-navy">Refuser cette inscription</h2>
            <p className="mt-2 text-sm text-slate-600">{rejecting.student?.full_name ?? 'Étudiant'} - {rejecting.courses?.title ?? 'Cours'}</p>
            <label className="mt-5 block text-sm font-bold text-brand-navy">Motif du rejet <span className="font-normal text-slate-400">(optionnel)</span>
              <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-brand-border p-3 font-normal outline-none focus:border-brand-orange" />
            </label>
            {rejectionDraft.restored ? <p className="mt-3 text-xs font-semibold text-orange-700">Votre motif non envoyé a été restauré.</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setRejecting(null)} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Fermer</button>
              <button disabled={busyId === rejecting.id} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Refuser</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
