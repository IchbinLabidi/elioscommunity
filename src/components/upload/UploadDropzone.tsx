import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, RefreshCcw, Trash2, X } from 'lucide-react';
import { UploadProgressState } from '../../hooks/useUploadWithProgress';
import UploadProgressBar from './UploadProgressBar';
import UploadStatusBadge from './UploadStatusBadge';

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

type Props = {
  label: string;
  helper: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  progress?: UploadProgressState;
  previewUrl?: string | null;
  compact?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
};

export default function UploadDropzone({ label, helper, accept, file, onChange, progress, previewUrl, compact = false, onCancel, onRetry }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const objectUrl = useMemo(() => file?.type.startsWith('image/') ? URL.createObjectURL(file) : null, [file]);
  const imageUrl = objectUrl || previewUrl;
  const active = progress?.status === 'preparing' || progress?.status === 'uploading' || progress?.status === 'processing';

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const select = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] ?? null);
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!active) onChange(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-bold text-brand-navy">{label}</p>
        {progress ? <UploadStatusBadge status={progress.status} /> : null}
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => !active && inputRef.current?.click()}
        onKeyDown={(event) => { if (!active && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(event) => { event.preventDefault(); if (!active) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`cursor-pointer rounded-2xl border border-dashed p-4 transition focus:outline-none focus:ring-2 focus:ring-brand-orange ${compact ? '' : 'min-h-36'} ${dragging ? 'border-brand-orange bg-orange-50' : 'border-brand-border bg-slate-50 hover:border-brand-orange'}`}
      >
        {imageUrl ? <img src={imageUrl} alt="" className={`${compact ? 'h-20 w-20' : 'aspect-video w-full'} rounded-xl object-cover`} /> : null}
        <div className={`${imageUrl ? 'mt-3' : compact ? '' : 'grid min-h-24 place-items-center text-center'}`}>
          <div>
            <FileUp className={`${compact ? 'mr-2 inline h-4 w-4' : 'mx-auto h-7 w-7'} text-brand-orange`} />
            <span className="font-semibold text-brand-navy">{file?.name ?? 'Glissez-deposez votre fichier ici ou cliquez pour parcourir'}</span>
            {file ? <span className="ml-2 text-xs text-slate-500">{formatSize(file.size)}</span> : null}
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          </div>
        </div>
        <input ref={inputRef} type="file" accept={accept} disabled={active} onChange={select} className="sr-only" />
      </div>
      {progress ? <UploadProgressBar state={progress} /> : null}
      {(file || active || progress?.status === 'error') ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {active && onCancel ? <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-slate-600"><X className="h-3.5 w-3.5" />Annuler</button> : null}
          {progress?.status === 'error' && onRetry ? <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><RefreshCcw className="h-3.5 w-3.5" />Reessayer</button> : null}
          {!active && file ? <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-slate-600"><Trash2 className="h-3.5 w-3.5" />Supprimer</button> : null}
        </div>
      ) : null}
    </div>
  );
}
