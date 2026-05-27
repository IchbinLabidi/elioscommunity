import { Eye, Search, ShieldOff, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { formatDate } from '../lib/utils';
import { AdminStudentSummary, blockStudent, getStudents, unblockStudent } from '../services/adminStudentsService';

export default function AdminStudentsPage({
  initialStatus = 'all',
  title = 'Students',
}: {
  initialStatus?: 'all' | 'active' | 'blocked';
  title?: string;
}) {
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get('status');
  const requestedStatus = queryStatus === 'active' || queryStatus === 'blocked' ? queryStatus : initialStatus;
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'blocked'>(requestedStatus);
  const [registeredAfter, setRegisteredAfter] = useState('');
  const [sort, setSort] = useState<'newest' | 'most-active' | 'most-purchases'>('newest');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [blocking, setBlocking] = useState<AdminStudentSummary | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    getStudents({ query, status, registeredAfter, sort })
      .then(setStudents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load students.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [query, registeredAfter, sort, status]);
  useEffect(() => setStatus(requestedStatus), [requestedStatus]);

  const blockedCount = useMemo(() => students.filter((student) => student.is_blocked).length, [students]);

  const toggleBlocked = async (student: AdminStudentSummary) => {
    setBusyId(student.id);
    setError('');
    try {
      if (student.is_blocked) {
        await unblockStudent(student.id);
      } else setBlocking(student);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update student status.');
    } finally {
      setBusyId('');
    }
  };
  const confirmBlock = async (reason: string) => {
    if (!blocking) return;
    setBusyId(blocking.id);
    try {
      await blockStudent(blocking.id, reason);
      setBlocking(null);
      load();
    } finally { setBusyId(''); }
  };

  return (
    <section className="space-y-6">
      <BackButton label="Back to dashboard" fallbackTo="/admin/dashboard" />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase text-brand-orange">Student management</p>
          <h1 className="mt-2 text-3xl font-black text-elios-navy">{title}</h1>
          <p className="mt-2 text-slate-600">Review accounts, purchases, activity, reports, and restrictions.</p>
        </div>
        <button type="button" onClick={() => setStatus('blocked')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-elios-navy hover:bg-slate-50">
          <ShieldOff className="h-4 w-4 text-red-600" />
          Blocked students {status === 'all' ? `(${blockedCount})` : ''}
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_170px_180px_190px]">
        <label className="relative">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-100" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-elios-navy">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <input type="date" value={registeredAfter} onChange={(event) => setRegisteredAfter(event.target.value)} className="h-12 rounded-xl border border-slate-200 px-3 text-sm text-elios-navy" aria-label="Registered after" />
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-elios-navy">
          <option value="newest">Newest</option>
          <option value="most-active">Most active</option>
          <option value="most-purchases">Most purchases</option>
        </select>
      </div>

      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading students" /> : (
        <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Registered</th>
                <th className="px-4 py-4">Activity</th>
                <th className="px-4 py-4">Enrollments</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="align-top transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-elios-sky text-elios-blue"><UserRound className="h-5 w-5" /></span>
                      <div><p className="font-bold text-elios-navy">{student.full_name}</p><p className="text-slate-500">{student.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${student.is_blocked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {student.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(student.created_at)}</td>
                  <td className="px-4 py-4 text-slate-600">
                    <p>{student.questionsCount} questions</p>
                    <p>{student.commentsCount} comments</p>
                    <p>{student.reportsSubmittedCount} reports</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p className="font-semibold text-emerald-700">{student.purchasedCoursesCount} purchased</p>
                    <p className="text-amber-700">{student.pendingEnrollmentsCount} pending</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/students/${student.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold text-elios-blue hover:bg-slate-50">
                        <Eye className="h-4 w-4" /> View
                      </Link>
                      <button disabled={busyId === student.id} onClick={() => toggleBlocked(student)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-bold disabled:opacity-50 ${student.is_blocked ? 'border-emerald-100 text-emerald-700' : 'border-red-100 text-red-700'}`}>
                        {student.is_blocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                        {student.is_blocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length ? <p className="p-10 text-center text-sm text-slate-500">No students match these filters.</p> : null}
        </div>
      )}
      <ActionDialog open={Boolean(blocking)} title="Bloquer cet étudiant ?" fieldLabel="Motif du blocage" required confirmLabel="Bloquer" danger busy={busyId === blocking?.id} resetKey={blocking?.id} onClose={() => setBlocking(null)} onConfirm={confirmBlock} />
    </section>
  );
}
