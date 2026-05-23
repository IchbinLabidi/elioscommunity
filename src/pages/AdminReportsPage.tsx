import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BackButton from '../components/navigation/BackButton';
import { deleteContent, getReports, hideContent, updateReportStatus } from '../services/adminService';
import { Report } from '../types/database';

export default function AdminReportsPage() {
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => {
    setLoading(true);
    getReports().then(setReports).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load reports.')).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = useMemo(() => reports.filter((report) => !status || report.status === status), [reports, status]);

  const resolve = async (report: Report, nextStatus: 'resolved' | 'rejected') => {
    const note = window.prompt('Admin note') || '';
    await updateReportStatus(report.id, nextStatus, note);
    load();
  };

  const hide = async (report: Report) => {
    const reason = window.prompt('Hide reason', report.reason) || report.reason;
    await hideContent(report.target_type, report.target_id, reason);
    await updateReportStatus(report.id, 'resolved', 'Target hidden');
    load();
  };

  const remove = async (report: Report) => {
    if (!window.confirm('Delete reported content?')) return;
    await deleteContent(report.target_type, report.target_id, report.reason);
    await updateReportStatus(report.id, 'resolved', 'Target deleted');
    load();
  };

  return (
    <section className="space-y-5">
      <BackButton label="Back to dashboard" fallbackTo="/admin/dashboard" />
      <h1 className="text-3xl font-bold text-elios-navy">Reports</h1>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3"><option value="">All statuses</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : <div className="space-y-3">{filtered.map((report) => (
        <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div><p className="font-bold text-elios-navy">{report.target_type} - {report.reason}</p><p className="text-sm text-slate-600">{report.description || 'No description.'}</p><p className="mt-1 text-xs text-slate-500">{report.status}</p></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => hide(report)} className="rounded-lg border px-3 py-2 text-sm font-bold text-elios-blue">Hide target</button>
              <button onClick={() => remove(report)} className="rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Delete target</button>
              <button onClick={() => resolve(report, 'resolved')} className="rounded-lg border px-3 py-2 text-sm font-bold">Resolve</button>
              <button onClick={() => resolve(report, 'rejected')} className="rounded-lg border px-3 py-2 text-sm font-bold">Reject</button>
            </div>
          </div>
        </article>
      ))}{!filtered.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No reports found.</p> : null}</div>}
    </section>
  );
}
