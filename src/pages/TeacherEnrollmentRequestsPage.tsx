import { useEffect, useMemo, useState } from 'react';
import EnrollmentReviewActions from '../components/EnrollmentReviewActions';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';
import { getTeacherEnrollmentRequests, reviewEnrollment } from '../services/enrollmentsService';
import { CourseEnrollmentWithCourse, EnrollmentStatus } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export default function TeacherEnrollmentRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<CourseEnrollmentWithCourse[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getTeacherEnrollmentRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load enrollment requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  const filtered = useMemo(() => requests.filter((request) => !status || request.status === status), [requests, status]);

  const review = async (request: CourseEnrollmentWithCourse, nextStatus: Extract<EnrollmentStatus, 'approved' | 'rejected'>) => {
    const reason = nextStatus === 'rejected' ? window.prompt('Rejection reason') || '' : '';
    setBusyId(request.id);
    setError('');
    try {
      await reviewEnrollment(request.id, nextStatus, reason);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review enrollment.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5">
      <BackButton
        label="Back to dashboard"
        fallbackTo={profile?.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard'}
      />
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">Enrollment requests</h1>
        <p className="mt-2 text-slate-600">Approve students after checking their payment proof.</p>
      </div>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3">
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {filtered.map((request) => (
            <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-bold text-elios-navy">{request.courses?.title || 'Course'}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.student?.full_name || 'Student'} - {formatDate(request.created_at)}</p>
                  {request.payment_note ? <p className="mt-2 text-sm text-slate-600">{request.payment_note}</p> : null}
                  {request.rejection_reason ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{request.rejection_reason}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EnrollmentStatusBadge status={request.status} />
                  {request.payment_proof_url ? <a href={request.payment_proof_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue">View proof</a> : null}
                  {request.status === 'pending' ? <EnrollmentReviewActions disabled={busyId === request.id} onApprove={() => review(request, 'approved')} onReject={() => review(request, 'rejected')} /> : null}
                </div>
              </div>
            </article>
          ))}
          {!filtered.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No enrollment requests found.</p> : null}
        </div>
      )}
    </section>
  );
}
