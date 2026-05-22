import { Eye, EyeOff, Trash2 } from 'lucide-react';

export default function ModerationActions({
  hidden,
  onHide,
  onUnhide,
  onDelete,
}: {
  hidden?: boolean;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {hidden ? (
        <button onClick={onUnhide} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue"><Eye className="h-4 w-4" />Unhide</button>
      ) : (
        <button onClick={onHide} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue"><EyeOff className="h-4 w-4" />Hide</button>
      )}
      <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700"><Trash2 className="h-4 w-4" />Delete</button>
    </div>
  );
}
