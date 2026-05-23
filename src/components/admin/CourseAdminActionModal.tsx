import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CourseAdminAction } from '../../services/adminCoursesService';

type Props = {
  open: boolean;
  courseTitle: string;
  action: CourseAdminAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

const copy: Record<CourseAdminAction, { title: string; description: string; label: string; required: boolean; danger?: boolean }> = {
  publish: { title: 'Publier ce cours', description: 'Le cours deviendra visible dans le catalogue s’il n’est pas masqué.', label: 'Publier', required: false },
  unpublish: { title: 'Dépublier ce cours', description: 'Le cours ne sera plus visible publiquement.', label: 'Dépublier', required: true },
  hide: { title: 'Masquer ce cours', description: 'Le cours et son contenu seront retirés du public.', label: 'Masquer', required: true, danger: true },
  unhide: { title: 'Restaurer ce cours', description: 'Le cours pourra redevenir visible selon son statut de publication.', label: 'Restaurer', required: false },
  feature: { title: 'Mettre ce cours en avant', description: 'Ce cours sera marqué comme recommandé.', label: 'Mettre en avant', required: false },
  unfeature: { title: 'Retirer de la une', description: 'Le cours ne sera plus mis en avant.', label: 'Retirer', required: false },
  approve: { title: 'Approuver ce cours', description: 'Le contrôle qualité sera marqué comme approuvé.', label: 'Approuver', required: false },
  request_changes: { title: 'Demander des modifications', description: 'Le prof verra la note de révision associée.', label: 'Demander les changements', required: true },
  reject: { title: 'Refuser ce cours', description: 'Le cours sera refusé et dépublié.', label: 'Refuser', required: true, danger: true },
  delete: { title: 'Supprimer ce cours', description: 'Le cours sera retiré de manière réversible pour les admins.', label: 'Supprimer', required: true, danger: true },
  restore: { title: 'Restaurer le cours supprimé', description: 'Le cours revient en brouillon visible par l’administration.', label: 'Restaurer', required: false },
};

export default function CourseAdminActionModal({ open, courseTitle, action, busy, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const content = copy[action];
  useEffect(() => { if (open) setReason(''); }, [action, open]);
  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (content.required && !reason.trim()) return;
    await onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-brand-navy">{content.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{content.description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-brand-navy">{courseTitle}</p>
        <label className="mt-4 block text-sm font-bold text-brand-navy">
          Note ou motif {content.required ? '' : '(optionnel)'}
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} required={content.required} rows={4} className="mt-2 w-full rounded-xl border border-brand-border p-3 font-normal outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-slate-700">Annuler</button>
          <button disabled={busy || (content.required && !reason.trim())} className={`rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${content.danger ? 'bg-red-700 hover:bg-red-800' : 'bg-brand-navy hover:bg-brand-navyDark'}`}>
            {busy ? 'Traitement...' : content.label}
          </button>
        </div>
      </form>
    </div>
  );
}
