import { useEffect, useState } from 'react';
import { AdminEnrollmentAction } from '../../services/adminEnrollmentsService';
import useFormDraft from '../../hooks/useFormDraft';

type Props = {
  open: boolean;
  action: AdminEnrollmentAction | null;
  studentName: string;
  busy: boolean;
  draftKey: string;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<boolean>;
};

const copy: Record<AdminEnrollmentAction, { title: string; description: string; button: string; danger?: boolean; reason?: boolean; note?: boolean }> = {
  approve: {
    title: 'Approuver cette inscription ?',
    description: "L'etudiant aura acces au contenu complet du cours.",
    button: 'Approuver',
    note: true,
  },
  reject: {
    title: "Refuser cette inscription",
    description: "L'etudiant pourra consulter le motif et renvoyer une preuve valide.",
    button: 'Refuser',
    danger: true,
    reason: true,
    note: true,
  },
  reset: {
    title: 'Remettre en attente',
    description: "L'inscription repassera en verification.",
    button: 'Remettre en attente',
    note: true,
  },
  cancel: {
    title: "Annuler l'inscription",
    description: "L'etudiant perdra tout acces accorde par cette inscription.",
    button: 'Annuler',
    danger: true,
    reason: true,
  },
  grant: {
    title: "Accorder l'acces manuellement ?",
    description: "L'etudiant aura immediatement acces au cours.",
    button: "Accorder l'acces",
    note: true,
  },
  remove_access: {
    title: "Retirer l'acces au cours",
    description: "L'acces complet sera retire immediatement.",
    button: "Retirer l'acces",
    danger: true,
    reason: true,
  },
  note: {
    title: 'Ajouter une note admin',
    description: "Cette note reste reservee a l'administration.",
    button: 'Enregistrer',
    note: true,
  },
};

export default function AdminEnrollmentActionModal({ open, action, studentName, busy, draftKey, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const draft = useFormDraft({
    key: `${draftKey}:${action ?? 'none'}`,
    values: { reason, note },
    onRestore: (values) => { setReason(values.reason); setNote(values.note); },
    enabled: open && Boolean(action),
  });
  useEffect(() => {
    if (open) setError('');
  }, [action, open]);

  if (!open || !action) return null;
  const content = copy[action];
  const submit = async () => {
    if (content.reason && !reason.trim()) {
      setError('Veuillez indiquer un motif.');
      return;
    }
    if (action === 'note' && !note.trim()) {
      setError('Veuillez saisir une note.');
      return;
    }
    if (await onConfirm(reason.trim(), note.trim())) {
      draft.clearDraft();
      setReason('');
      setNote('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/45 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-black text-brand-navy">{content.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{content.description}</p>
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-navy">{studentName}</p>
        {content.reason ? (
          <label className="mt-5 block text-sm font-bold text-brand-navy">
            Motif
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border p-3 font-normal outline-none focus:ring-2 focus:ring-brand-orange" />
          </label>
        ) : null}
        {content.note ? (
          <label className="mt-4 block text-sm font-bold text-brand-navy">
            Note admin {action === 'note' ? '' : '(optionnelle)'}
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border p-3 font-normal outline-none focus:ring-2 focus:ring-brand-orange" />
          </label>
        ) : null}
        {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {draft.restored ? <p className="mt-3 text-xs font-semibold text-orange-700">Votre brouillon d'action a été restauré.</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Annuler</button>
          <button type="button" onClick={() => void submit()} disabled={busy} className={`rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60 ${content.danger ? 'bg-red-600' : 'bg-brand-navy'}`}>
            {busy ? 'Traitement...' : content.button}
          </button>
        </div>
      </div>
    </div>
  );
}
