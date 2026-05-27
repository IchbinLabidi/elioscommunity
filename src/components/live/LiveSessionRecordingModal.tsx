import { PlayCircle, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import useFormDraft from '../../hooks/useFormDraft';
import { LiveSession } from '../../types/liveSessions';

type Props = {
  session: LiveSession | null;
  saving: boolean;
  error: string;
  draftKey: string;
  onClose: () => void;
  onSave: (url: string) => Promise<boolean>;
};

export default function LiveSessionRecordingModal({ session, saving, error, draftKey, onClose, onSave }: Props) {
  const [url, setUrl] = useState('');
  const restoredRef = useRef(false);
  const draft = useFormDraft({
    key: `${draftKey}:${session?.id ?? 'none'}`,
    values: { url },
    onRestore: (values) => { restoredRef.current = true; setUrl(values.url); },
    enabled: Boolean(session),
  });
  useEffect(() => {
    if (!restoredRef.current) setUrl(session?.recording_url ?? '');
    restoredRef.current = false;
  }, [session]);
  if (!session) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await onSave(url.trim())) draft.clearDraft();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="recording-title" className="w-full max-w-lg rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-brand-orange"><PlayCircle className="h-4 w-4" />Replay</p>
            <h2 id="recording-title" className="mt-2 text-2xl font-black text-brand-navy">{session.recording_url ? "Modifier l'enregistrement" : "Ajouter l'enregistrement"}</h2>
            <p className="mt-2 text-sm text-slate-600">{session.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-xl border border-brand-border text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </div>
        {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <form onSubmit={(event) => void submit(event)} className="mt-6">
          <label className="block text-sm font-bold text-brand-navy">Lien de l'enregistrement
            <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" />
          </label>
          <p className="mt-3 text-sm leading-6 text-slate-500">L'enregistrement sera disponible pour les étudiants dont l'accès au cours est approuvé.</p>
          {draft.restored ? <p className="mt-3 text-xs font-semibold text-orange-700">Votre lien non enregistré a été restauré.</p> : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">Annuler</button>
            <button disabled={saving || !url.trim()} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
