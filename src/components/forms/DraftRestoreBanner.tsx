import { History } from 'lucide-react';

export default function DraftRestoreBanner({ fileReminder, onKeep, onDiscard }: { fileReminder?: string; onKeep: () => void; onDiscard: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex gap-2 text-sm font-semibold text-orange-900">
        <History className="h-4 w-4 shrink-0 text-brand-orange" />
        <span>Un brouillon a été restauré.{fileReminder ? ` ${fileReminder}` : ''}</span>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onKeep} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-brand-navy">Garder</button>
        <button type="button" onClick={onDiscard} className="rounded-lg px-3 py-2 text-xs font-bold text-red-700">Supprimer</button>
      </div>
    </div>
  );
}
