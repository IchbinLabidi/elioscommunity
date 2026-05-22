import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createReport } from '../services/reportsService';
import { ReportTargetType } from '../types/database';

const reasons = ['Spam', 'Inappropriate content', 'Harassment', 'False information', 'Copyright issue', 'Other'];

export default function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const { session, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (profile?.is_blocked) {
      setMessage('Your account has been restricted. Contact support for more information.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await createReport(targetType, targetId, reason, description);
      setMessage('Report submitted.');
      setOpen(false);
      setDescription('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="relative inline-block">
      <button
        onClick={() => {
          if (!session || loading) {
            setMessage('Log in to report content.');
            return;
          }
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-elios-blue"
      >
        <Flag className="h-4 w-4" />Report
      </button>
      {message ? <span className="ml-2 text-xs text-slate-500">{message}</span> : null}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold text-elios-navy">Report content</h2>
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-3">
              {reasons.map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Optional details" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-3" />
            <div className="mt-4 flex gap-2">
              <button disabled={saving} onClick={submit} className="rounded-lg bg-elios-navy px-4 py-3 font-bold text-white">{saving ? 'Submitting...' : 'Submit report'}</button>
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-3 font-bold text-elios-blue">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </span>
  );
}
