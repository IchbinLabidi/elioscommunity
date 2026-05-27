import { CheckCircle2, LoaderCircle, TriangleAlert } from 'lucide-react';

type Props = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
};

export default function DraftStatus({ status, lastSavedAt }: Props) {
  if (status === 'idle') return null;
  if (status === 'saving') {
    return <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Sauvegarde en cours...</span>;
  }
  if (status === 'error') {
    return <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-600"><TriangleAlert className="h-3.5 w-3.5" />Erreur de sauvegarde du brouillon.</span>;
  }
  return <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Brouillon enregistré{lastSavedAt ? ` à ${new Intl.DateTimeFormat('fr-TN', { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSavedAt))}` : ''}</span>;
}
