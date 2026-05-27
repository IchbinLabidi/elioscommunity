import { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Profile } from '../../types/database';
import DraftStatus from '../forms/DraftStatus';
import useFormDraft from '../../hooks/useFormDraft';

export default function RevenueShareModal({
  teacher,
  busy,
  error,
  draftKey,
  onClose,
  onSave,
}: {
  teacher: Pick<Profile, 'id' | 'full_name' | 'teacher_revenue_share_percent'> | null;
  busy: boolean;
  error: string;
  draftKey: string;
  onClose: () => void;
  onSave: (percent: number, note?: string) => Promise<boolean>;
}) {
  const [percent, setPercent] = useState('50');
  const [note, setNote] = useState('');
  const [validation, setValidation] = useState('');
  const restoredRef = useRef(false);
  const revenueDraft = useFormDraft({
    key: `${draftKey}:${teacher?.id ?? 'none'}`,
    values: { percent, note },
    onRestore: (values) => {
      restoredRef.current = true;
      setPercent(values.percent);
      setNote(values.note);
    },
    enabled: Boolean(teacher),
  });

  useEffect(() => {
    if (!restoredRef.current) {
      setPercent(String(teacher?.teacher_revenue_share_percent ?? 50));
      setNote('');
    }
    setValidation('');
  }, [teacher]);

  if (!teacher) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setValidation('Pourcentage invalide. Saisissez une valeur entre 0 et 100.');
      return;
    }
    setValidation('');
    if (await onSave(value, note || undefined)) revenueDraft.clearDraft();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-5 rounded-2xl border border-brand-border bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-brand-navy">Modifier le pourcentage du professeur</h2>
            <p className="mt-1 text-sm text-slate-500">{teacher.full_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <label className="block text-sm font-bold text-brand-navy">
          Pourcentage professeur
          <div className="relative mt-2">
            <input type="number" min="0" max="100" step="0.01" value={percent} onChange={(event) => setPercent(event.target.value)} className="h-12 w-full rounded-xl border border-brand-border px-4 pr-10 text-lg font-bold outline-none focus:border-brand-orange" />
            <span className="absolute right-4 top-3 text-slate-500">%</span>
          </div>
        </label>
        <label className="block text-sm font-bold text-brand-navy">
          Note optionnelle
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border p-3 text-sm outline-none focus:border-brand-orange" placeholder="Contexte de la négociation" />
        </label>
        <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900">Ce pourcentage sera appliqué aux prochains paiements approuvés. Les revenus déjà calculés ne seront pas modifiés.</p>
        {revenueDraft.restored ? <p className="rounded-xl bg-blue-50 p-3 text-sm text-brand-navy">Un brouillon a ete restaure.</p> : null}
        {validation || error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{validation || error}</p> : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Annuler</button>
          <button disabled={busy} className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
        <DraftStatus status={revenueDraft.status} lastSavedAt={revenueDraft.lastSavedAt} />
      </form>
    </div>
  );
}
