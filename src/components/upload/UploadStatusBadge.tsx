import { UploadStatus } from '../../hooks/useUploadWithProgress';

const statusMap: Record<Exclude<UploadStatus, 'idle'>, { text: string; style: string }> = {
  preparing: { text: 'Preparation', style: 'bg-slate-100 text-slate-600' },
  uploading: { text: 'En cours', style: 'bg-orange-50 text-brand-orange' },
  processing: { text: 'Traitement', style: 'bg-orange-50 text-brand-orange' },
  success: { text: 'Ajoute', style: 'bg-emerald-50 text-emerald-700' },
  error: { text: 'Echec', style: 'bg-red-50 text-red-700' },
  cancelled: { text: 'Annule', style: 'bg-slate-100 text-slate-600' },
};

export default function UploadStatusBadge({ status }: { status: UploadStatus }) {
  if (status === 'idle') return null;
  const value = statusMap[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${value.style}`}>{value.text}</span>;
}
