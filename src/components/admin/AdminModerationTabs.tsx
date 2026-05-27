import { MessageSquare, MessagesSquare, TextQuote } from 'lucide-react';
import { ModerationTab } from '../../services/adminModerationService';

const tabs: Array<{ id: ModerationTab; label: string; icon: typeof MessageSquare }> = [
  { id: 'question', label: 'Questions', icon: MessageSquare },
  { id: 'answer', label: 'Réponses', icon: TextQuote },
  { id: 'answer_comment', label: 'Commentaires', icon: MessagesSquare },
];

export default function AdminModerationTabs({ value, onChange }: { value: ModerationTab; onChange: (tab: ModerationTab) => void }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-brand-border bg-white p-2 shadow-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none ${
              value === tab.id ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-navy'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
