import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LiveSessionStatus } from '../../types/liveSessions';

type DeletableSession = {
  title: string;
  status: LiveSessionStatus;
  hasRecording: boolean;
  courseTitle?: string;
  teacherName?: string;
  isRecurring?: boolean;
};

type Props = {
  session: DeletableSession | null;
  saving: boolean;
  error: string;
  adminContext?: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
};

export default function DeleteLiveSessionModal({ session, saving, error, adminContext = false, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [session]);

  if (!session) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="delete-session-title" className="max-h-[calc(100vh-24px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-brand-border bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-red-600"><Trash2 className="h-4 w-4" />Action sensible</p>
            <h2 id="delete-session-title" className="mt-2 text-2xl font-black text-brand-navy">Supprimer cette session ?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Cette action supprimera la session live et l'événement Google Calendar associé. Les étudiants inscrits seront informés.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-border text-slate-500 hover:bg-slate-50 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        {adminContext ? <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-brand-navy">{session.courseTitle}</strong>{session.teacherName ? ` · ${session.teacherName}` : ''}</p> : null}
        {session.status === 'live' ? <Warning>Cette session est en direct. La supprimer mettra fin à son affichage dans la plateforme et supprimera l'événement Calendar.</Warning> : null}
        {session.hasRecording ? <Warning>Cette session possède un enregistrement. La suppression la masquera des listes normales.</Warning> : null}
        {session.isRecurring ? <Warning>Cette session fait partie d'une série récurrente. Cette action concerne uniquement cette occurrence.</Warning> : null}
        {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <label className="mt-6 block text-sm font-bold text-brand-navy">Raison de la suppression <span className="font-normal text-slate-400">(facultatif)</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-red-400" placeholder="Expliquez brièvement la raison (optionnel)" />
        </label>
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">Annuler</button>
          <button type="button" onClick={() => onConfirm(reason.trim() || undefined)} disabled={saving} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Suppression...' : 'Supprimer la session'}</button>
        </div>
      </section>
    </div>
  );
}

function Warning({ children }: { children: string }) {
  return <p className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{children}</p>;
}
