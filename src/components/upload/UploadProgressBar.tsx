import { UploadProgressState } from '../../hooks/useUploadWithProgress';

function size(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const messages = {
  preparing: 'Preparation du fichier...',
  uploading: 'Televersement en cours...',
  processing: 'Traitement du fichier...',
  success: 'Fichier ajoute avec succes',
  error: 'Echec du televersement',
  cancelled: 'Televersement annule',
  idle: '',
};

export default function UploadProgressBar({ state }: { state: UploadProgressState }) {
  if (state.status === 'idle') return null;
  const active = state.status === 'preparing' || state.status === 'uploading' || state.status === 'processing';
  return (
    <div className="mt-3 rounded-xl border border-brand-border bg-white p-3">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
        <span>{messages[state.status]}</span>
        {state.status === 'uploading' || state.status === 'success' ? <span>{state.progress}%</span> : null}
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] ${state.status === 'error' ? 'bg-red-500' : state.status === 'success' ? 'bg-emerald-500' : 'bg-brand-orange'} ${active && !state.total ? 'w-1/3 animate-pulse' : ''}`} style={state.total ? { width: `${state.progress}%` } : undefined} />
      </div>
      {state.total ? <p className="mt-2 text-xs text-slate-500">{size(state.loaded)} / {size(state.total)}</p> : null}
      {state.error ? <p className="mt-2 text-xs font-semibold text-red-700">{state.error}</p> : null}
    </div>
  );
}
