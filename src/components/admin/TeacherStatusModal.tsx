import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TeacherVerificationStatus } from '../../types/database';

type StatusAction = 'verify' | 'reject' | 'suspend' | 'unsuspend' | 'block' | 'unblock' | 'remove';

const labels: Record<StatusAction, { title: string; confirm: string; status: TeacherVerificationStatus; needsReason: boolean }> = {
  verify: { title: 'Verifier ce prof ?', confirm: 'Verifier', status: 'verified', needsReason: false },
  reject: { title: 'Refuser la verification', confirm: 'Refuser', status: 'rejected', needsReason: true },
  suspend: { title: 'Suspendre ce prof', confirm: 'Suspendre', status: 'suspended', needsReason: true },
  unsuspend: { title: 'Reactiver ce prof ?', confirm: 'Reactiver', status: 'pending', needsReason: false },
  block: { title: 'Bloquer ce prof', confirm: 'Bloquer', status: 'blocked', needsReason: true },
  unblock: { title: 'Debloquer ce prof ?', confirm: 'Debloquer', status: 'pending', needsReason: false },
  remove: { title: 'Retirer la verification', confirm: 'Retirer', status: 'pending', needsReason: false },
};

export type TeacherStatusModalAction = StatusAction;

export default function TeacherStatusModal({
  action,
  open,
  busy,
  teacherName,
  onClose,
  onConfirm,
}: {
  action: StatusAction | null;
  open: boolean;
  busy: boolean;
  teacherName: string;
  onClose: () => void;
  onConfirm: (status: TeacherVerificationStatus, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open, action]);
  if (!open || !action) return null;
  const option = labels[action];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (option.needsReason && !reason.trim()) return;
    await onConfirm(option.status, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-elios-navy">{option.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{teacherName}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </div>
        {option.needsReason || action === 'remove' ? (
          <label className="mt-5 block text-sm font-bold text-elios-navy">
            Motif {option.needsReason ? '(obligatoire)' : '(optionnel)'}
            <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-100" />
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Annuler</button>
          <button disabled={busy || (option.needsReason && !reason.trim())} className={`rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${action === 'verify' || action === 'unblock' || action === 'unsuspend' ? 'bg-emerald-600' : 'bg-elios-navy'}`}>
            {busy ? 'Enregistrement...' : option.confirm}
          </button>
        </div>
      </form>
    </div>
  );
}
