import { FormEvent, useState } from 'react';
import DraftStatus from '../forms/DraftStatus';
import useFormDraft from '../../hooks/useFormDraft';
import { CourseChapterWithContent } from '../../types/database';
import BuilderModal from './BuilderModal';

type Values = { title: string; description: string; isPublished: boolean; isFreePreview: boolean };

type Props = {
  chapter: CourseChapterWithContent;
  busy: boolean;
  error: string;
  draftKey: string;
  onClose: () => void;
  onSave: (values: Values) => Promise<boolean>;
};

export default function ChapterEditorModal({ chapter, busy, error, draftKey, onClose, onSave }: Props) {
  const [values, setValues] = useState<Values>({
    title: chapter.title,
    description: chapter.description ?? '',
    isPublished: chapter.is_published,
    isFreePreview: chapter.is_free_preview,
  });
  const [validation, setValidation] = useState('');
  const draft = useFormDraft({
    key: `${draftKey}:${chapter.id}`,
    values,
    onRestore: setValues,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (values.title.trim().length < 3) {
      setValidation('Le titre doit contenir au moins 3 caractères.');
      return;
    }
    setValidation('');
    if (await onSave(values)) draft.clearDraft();
  };

  return (
    <BuilderModal
      title="Modifier le chapitre"
      subtitle="Mettez à jour le titre, la visibilité et l’accès aperçu."
      busy={busy}
      onClose={onClose}
      footer={(
        <>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-bold text-brand-navy">Annuler</button>
          <button type="submit" form="chapter-editor-form" disabled={busy} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </>
      )}
    >
      <form id="chapter-editor-form" onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-bold text-brand-navy">Titre du chapitre
          <input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 font-normal outline-none focus:border-brand-orange" />
        </label>
        <label className="block text-sm font-bold text-brand-navy">Description <span className="font-normal text-slate-400">(optionnelle)</span>
          <textarea value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-brand-border p-4 font-normal outline-none focus:border-brand-orange" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={values.isPublished} onChange={(isPublished) => setValues({ ...values, isPublished })} label="Publié" />
          <Toggle checked={values.isFreePreview} onChange={(isFreePreview) => setValues({ ...values, isFreePreview })} label="Aperçu gratuit" />
        </div>
        {validation || error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{validation || error}</p> : null}
        <DraftStatus status={draft.status} lastSavedAt={draft.lastSavedAt} />
      </form>
    </BuilderModal>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex items-center justify-between rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-orange" /></label>;
}
