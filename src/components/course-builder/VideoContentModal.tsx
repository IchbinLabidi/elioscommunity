import { FormEvent, useRef, useState } from 'react';
import { Link2, Upload } from 'lucide-react';
import DraftStatus from '../forms/DraftStatus';
import ActionDialog from '../ui/ActionDialog';
import UploadDropzone from '../upload/UploadDropzone';
import useFormDraft from '../../hooks/useFormDraft';
import { UploadProgressState } from '../../hooks/useUploadWithProgress';
import { ChapterVideo, CourseChapterWithContent } from '../../types/database';
import BuilderModal from './BuilderModal';

export type VideoModalValues = {
  title: string;
  description: string;
  sourceMode: 'link' | 'upload';
  videoUrl: string;
  durationMinutes: string;
  isPublished: boolean;
  file: File | null;
};

type Props = {
  chapter: CourseChapterWithContent;
  video?: ChapterVideo | null;
  initialMode?: 'link' | 'upload';
  busy: boolean;
  error: string;
  draftKey: string;
  uploadProgress?: UploadProgressState;
  onCancelUpload?: () => void;
  onClose: () => void;
  onSave: (values: VideoModalValues) => Promise<boolean>;
};

export default function VideoContentModal({ chapter, video, initialMode = 'link', busy, error, draftKey, uploadProgress, onCancelUpload, onClose, onSave }: Props) {
  const editing = Boolean(video);
  const existingMode = video?.video_path ? 'upload' : 'link';
  const [values, setValues] = useState<Omit<VideoModalValues, 'file'>>({
    title: video?.title ?? '',
    description: video?.description ?? '',
    sourceMode: editing ? existingMode : initialMode,
    videoUrl: video?.video_path ? '' : video?.video_url ?? '',
    durationMinutes: video?.duration_seconds ? String(Math.round(video.duration_seconds / 60)) : '',
    isPublished: video?.is_published ?? true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft({ key: `${draftKey}:${video?.id ?? `${chapter.id}:${initialMode}`}`, values, onRestore: setValues });
  const uploading = uploadProgress?.status === 'preparing' || uploadProgress?.status === 'uploading' || uploadProgress?.status === 'processing';

  const requestClose = () => {
    if (uploading) setConfirmClose(true);
    else onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const title = values.title.trim();
    if (!title) return setValidation('Le titre est obligatoire.');
    if (values.sourceMode === 'link') {
      if (!values.videoUrl.trim()) return setValidation('Veuillez ajouter une source video.');
      try { new URL(values.videoUrl.trim()); } catch { return setValidation('Le lien video doit etre une URL valide.'); }
    }
    if (values.sourceMode === 'upload' && !file && !(editing && video?.video_path)) return setValidation('Veuillez selectionner un fichier video.');
    setValidation('');
    if (await onSave({ ...values, file })) draft.clearDraft();
  };

  return (
    <>
      <BuilderModal
        title={editing ? 'Modifier la video' : 'Ajouter une video'}
        subtitle={editing ? 'Modifiez les informations de cette lecon video.' : 'Creez une lecon video dans ce chapitre.'}
        busy={busy && !uploading}
        onClose={requestClose}
        footer={(
          <>
            <button type="button" disabled={busy && !uploading} onClick={requestClose} className="rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-bold text-brand-navy">Annuler</button>
            <button type="submit" form="video-content-form" disabled={busy} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy ? (uploading ? 'Televersement en cours...' : 'Ajout en cours...') : editing ? 'Enregistrer les modifications' : 'Ajouter la video'}
            </button>
          </>
        )}
      >
        <form ref={formRef} id="video-content-form" onSubmit={submit} className="space-y-4">
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-bold text-brand-navy">Chapitre {chapter.chapter_order}</span> - {chapter.title}</p>
          <label htmlFor="video-title" className="block text-sm font-bold text-brand-navy">Titre de la video
            <input id="video-title" name="title" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 font-normal outline-none focus:border-brand-orange" />
          </label>
          <label htmlFor="video-description" className="block text-sm font-bold text-brand-navy">Description <span className="font-normal text-slate-400">(optionnelle)</span>
            <textarea id="video-description" name="description" value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-2 w-full rounded-xl border border-brand-border p-4 font-normal outline-none focus:border-brand-orange" />
          </label>
          <div>
            <p className="text-sm font-bold text-brand-navy">Source video</p>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
              <button type="button" onClick={() => setValues((current) => ({ ...current, sourceMode: 'link' }))} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold ${values.sourceMode === 'link' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500'}`}><Link2 className="h-4 w-4" />Lien externe</button>
              <button type="button" onClick={() => setValues((current) => ({ ...current, sourceMode: 'upload' }))} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold ${values.sourceMode === 'upload' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500'}`}><Upload className="h-4 w-4" />Import fichier</button>
            </div>
          </div>
          {values.sourceMode === 'link' ? (
            <label className="block text-sm font-bold text-brand-navy">URL video
              <input value={values.videoUrl} onChange={(event) => setValues((current) => ({ ...current, videoUrl: event.target.value }))} placeholder="https://www.youtube.com/..." className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 font-normal outline-none focus:border-brand-orange" />
              <span className="mt-2 block text-xs font-normal text-slate-500">YouTube, Vimeo ou lien video externe accessible.</span>
            </label>
          ) : (
            <UploadDropzone label="Fichier video" helper="MP4, WebM ou MOV. La limite video configuree s'applique." accept="video/mp4,video/webm,video/quicktime" file={file} onChange={setFile} progress={uploadProgress} onCancel={onCancelUpload} onRetry={() => formRef.current?.requestSubmit()} />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-brand-navy">Duree <span className="font-normal text-slate-400">(minutes)</span>
              <input type="number" min="1" value={values.durationMinutes} onChange={(event) => setValues((current) => ({ ...current, durationMinutes: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 font-normal outline-none focus:border-brand-orange" />
            </label>
            <label className="mt-7 flex h-12 items-center justify-between rounded-xl border border-brand-border px-4 text-sm font-bold text-brand-navy">Visible par les etudiants
              <input type="checkbox" checked={values.isPublished} onChange={(event) => setValues((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 accent-brand-orange" />
            </label>
          </div>
          {validation || error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{validation || error}</p> : null}
          <DraftStatus status={draft.status} lastSavedAt={draft.lastSavedAt} />
        </form>
      </BuilderModal>
      <ActionDialog open={confirmClose} title="Televersement en cours" message="Un fichier est en cours de televersement. Si vous quittez maintenant, le televersement sera annule." confirmLabel="Annuler le televersement" cancelLabel="Continuer le televersement" danger onClose={() => setConfirmClose(false)} onConfirm={() => { onCancelUpload?.(); setConfirmClose(false); onClose(); }} />
    </>
  );
}
