import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  action: 'hide' | 'restore' | 'delete';
  targetLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

const copy = {
  hide: { title: 'Masquer ce contenu', button: 'Masquer', description: 'Le contenu ne sera plus visible publiquement.' },
  restore: { title: 'Restaurer ce contenu', button: 'Restaurer', description: 'Le contenu redeviendra visible si la discussion parente est visible.' },
  delete: { title: 'Supprimer ce contenu', button: 'Supprimer', description: 'Cette suppression est reversible par un admin, mais le contenu sera retire du public.' },
};

export default function ModerationReasonModal({ isOpen, action, targetLabel, busy, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const content = copy[action];

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen, action]);

  if (!isOpen) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((action === 'hide' || action === 'delete') && !reason.trim()) return;
    await onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">{content.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{content.description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">{targetLabel}</p>
        <label className="mt-4 block text-sm font-bold text-brand-navy">
          Motif {action === 'restore' ? '(optionnel)' : ''}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required={action !== 'restore'}
            rows={4}
            placeholder="Expliquez la decision de moderation..."
            className="mt-2 w-full rounded-xl border border-brand-border px-3 py-3 font-normal text-slate-700 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
          <button
            disabled={busy || ((action === 'hide' || action === 'delete') && !reason.trim())}
            className={`rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${action === 'delete' ? 'bg-red-700 hover:bg-red-800' : 'bg-brand-navy hover:bg-brand-navyDark'}`}
          >
            {busy ? 'Traitement...' : content.button}
          </button>
        </div>
      </form>
    </div>
  );
}
