import { FormEvent, useEffect, useState } from 'react';

export default function ContentVisibilityModal({ open, visible, title, busy, onClose, onConfirm }: {
  open: boolean;
  visible: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open, visible]);
  if (!open) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (visible && !reason.trim()) return;
    await onConfirm(reason.trim());
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-black text-brand-navy">{visible ? 'Masquer le contenu' : 'Restaurer le contenu'}</h2>
        <p className="mt-2 text-sm text-slate-600">{title}</p>
        {visible ? <textarea value={reason} onChange={(event) => setReason(event.target.value)} required rows={4} placeholder="Motif requis" className="mt-4 w-full rounded-xl border border-brand-border p-3 outline-none focus:border-brand-orange" /> : null}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold">Annuler</button>
          <button disabled={busy || (visible && !reason.trim())} className="rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Traitement...' : visible ? 'Masquer' : 'Restaurer'}</button>
        </div>
      </form>
    </div>
  );
}
