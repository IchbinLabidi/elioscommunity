import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getAuditLogs } from '../services/adminService';
import { AdminAuditLog } from '../types/database';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    getAuditLogs().then(setLogs).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load audit logs.')).finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold text-elios-navy">Audit logs</h1>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : <div className="space-y-3">{logs.map((log) => (
        <article key={log.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-bold text-elios-navy">{log.action} - {log.target_type}</p>
          <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
          {log.details ? <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(log.details, null, 2)}</pre> : null}
        </article>
      ))}{!logs.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No audit logs yet.</p> : null}</div>}
    </section>
  );
}
