import { FormEvent, useRef, useState } from 'react';
import DraftStatus from '../forms/DraftStatus';
import ActionDialog from '../ui/ActionDialog';
import UploadDropzone from '../upload/UploadDropzone';
import useFormDraft from '../../hooks/useFormDraft';
import { UploadProgressState } from '../../hooks/useUploadWithProgress';
import { ChapterAttachment, CourseChapterWithContent } from '../../types/database';
import BuilderModal from './BuilderModal';

export type ResourceModalValues = { title: string; isPublished: boolean; file: File | null };

type Props = {
  chapter: CourseChapterWithContent;
  attachment?: ChapterAttachment | null;
  busy: boolean;
  error: string;
  draftKey: string;
  uploadProgress?: UploadProgressState;
  onCancelUpload?: () => void;
  onClose: () => void;
  onSave: (values: ResourceModalValues) => Promise<boolean>;
};

export default function ResourceContentModal({ chapter, attachment, busy, error, draftKey, uploadProgress, onCancelUpload, onClose, onSave }: Props) {
  const editing = Boolean(attachment);
  const [values, setValues] = useState({ title: attachment?.title ?? '', isPublished: attachment?.is_published ?? true });
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft({ key: `${draftKey}:${attachment?.id ?? chapter.id}`, values, onRestore: setValues });
  const uploading = uploadProgress?.status === 'preparing' || uploadProgress?.status === 'uploading' || uploadProgress?.status === 'processing';
  const requestClose = () => uploading ? setConfirmClose(true) : onClose();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.title.trim()) return setValidation('Le titre est obligatoire.');
    if (!editing && !file) return setValidation('Veuillez selectionner un fichier.');
    setValidation('');
    if (await onSave({ ...values, file })) draft.clearDraft();
  };

  return (
    <>
      <BuilderModal title={editing ? 'Modifier la ressource' : 'Ajouter une ressource'} subtitle="Ajoutez un PDF ou un fichier joint a ce chapitre." busy={busy && !uploading} onClose={requestClose} footer={(
        <>
          <button type="button" disabled={busy && !uploading} onClick={requestClose} className="rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-bold text-brand-navy">Annuler</button>
          <button type="submit" form="resource-content-form" disabled={busy} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? (uploading ? 'Televersement en cours...' : 'Ajout en cours...') : editing ? 'Enregistrer' : 'Ajouter la ressource'}</button>
        </>
      )}>
        <form ref={formRef} id="resource-content-form" onSubmit={submit} className="space-y-4">
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-bold text-brand-navy">Chapitre {chapter.chapter_order}</span> - {chapter.title}</p>
          <label htmlFor="resource-title" className="block text-sm font-bold text-brand-navy">Titre du document
            <input id="resource-title" name="title" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 font-normal outline-none focus:border-brand-orange" />
          </label>
          <UploadDropzone label="Fichier" helper="PDF, document, image ou archive selon les formats autorises." accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip" file={file} onChange={setFile} progress={uploadProgress} onCancel={onCancelUpload} onRetry={() => formRef.current?.requestSubmit()} />
          <label className="flex h-12 items-center justify-between rounded-xl border border-brand-border px-4 text-sm font-bold text-brand-navy">Visible par les etudiants
            <input type="checkbox" checked={values.isPublished} onChange={(event) => setValues((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 accent-brand-orange" />
          </label>
          {validation || error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{validation || error}</p> : null}
          <DraftStatus status={draft.status} lastSavedAt={draft.lastSavedAt} />
        </form>
      </BuilderModal>
      <ActionDialog open={confirmClose} title="Televersement en cours" message="Un fichier est en cours de televersement. Si vous quittez maintenant, le televersement sera annule." confirmLabel="Annuler le televersement" cancelLabel="Continuer le televersement" danger onClose={() => setConfirmClose(false)} onConfirm={() => { onCancelUpload?.(); setConfirmClose(false); onClose(); }} />
    </>
  );
}
