import { CheckCircle2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getModerationState, ModerationItem } from '../../services/adminModerationService';

const styles = {
  visible: { label: 'Visible', icon: Eye, className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  hidden: { label: 'Masque', icon: EyeOff, className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  deleted: { label: 'Supprime', icon: Trash2, className: 'bg-red-50 text-red-700 ring-red-100' },
  reviewed: { label: 'Verifie', icon: CheckCircle2, className: 'bg-blue-50 text-blue-700 ring-blue-100' },
};

export default function ModerationStatusBadge({ item }: { item: Pick<ModerationItem, 'isDeleted' | 'isHidden' | 'reviewedAt'> }) {
  const style = styles[getModerationState(item)];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {style.label}
    </span>
  );
}
