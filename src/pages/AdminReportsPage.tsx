import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BackButton from '../components/navigation/BackButton';
import ActionDialog from '../components/ui/ActionDialog';
import { deleteContent, getReports, hideContent, updateReportStatus } from '../services/adminService';
import { Report } from '../types/database';

export default function AdminReportsPage() {
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<{ kind: 'hide' | 'delete' | 'resolved' | 'rejected'; report: Report } | null>(null);
  const load = () => {
    setLoading(true);
    getReports().then(setReports).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load reports.')).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = useMemo(() => reports.filter((report) => !status || report.status === status), [reports, status]);

  const resolve = async (note: string) => {
    if (!action || (action.kind !== 'resolved' && action.kind !== 'rejected')) return;
    await updateReportStatus(action.report.id, action.kind, note);
    setAction(null);
    load();
  };

  const hide = async (reason: string) => {
    if (!action || action.kind !== 'hide') return;
    await hideContent(action.report.target_type, action.report.target_id, reason || action.report.reason);
    await updateReportStatus(action.report.id, 'resolved', 'Target hidden');
    setAction(null);
    load();
  };

  const remove = async () => {
    if (!action || action.kind !== 'delete') return;
    await deleteContent(action.report.target_type, action.report.target_id, action.report.reason);
    await updateReportStatus(action.report.id, 'resolved', 'Target deleted');
    setAction(null);
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
              <button onClick={() => setAction({ kind: 'hide', report })} className="rounded-lg border px-3 py-2 text-sm font-bold text-elios-blue">Hide target</button>
              <button onClick={() => setAction({ kind: 'delete', report })} className="rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Delete target</button>
              <button onClick={() => setAction({ kind: 'resolved', report })} className="rounded-lg border px-3 py-2 text-sm font-bold">Resolve</button>
              <button onClick={() => setAction({ kind: 'rejected', report })} className="rounded-lg border px-3 py-2 text-sm font-bold">Reject</button>
            </div>
          </div>
        </article>
      ))}{!filtered.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No reports found.</p> : null}</div>}
      <ActionDialog open={action?.kind === 'hide'} title="Masquer le contenu signalé ?" fieldLabel="Motif" initialValue={action?.report.reason ?? ''} confirmLabel="Masquer" resetKey={action?.report.id} onClose={() => setAction(null)} onConfirm={hide} />
      <ActionDialog open={action?.kind === 'delete'} title="Supprimer le contenu signalé ?" confirmLabel="Supprimer" danger resetKey={action?.report.id} onClose={() => setAction(null)} onConfirm={() => void remove()} />
      <ActionDialog open={action?.kind === 'resolved' || action?.kind === 'rejected'} title={action?.kind === 'resolved' ? 'Résoudre ce signalement ?' : 'Rejeter ce signalement ?'} fieldLabel="Note admin" confirmLabel="Confirmer" resetKey={action?.report.id} onClose={() => setAction(null)} onConfirm={resolve} />
    </section>
  );
}
