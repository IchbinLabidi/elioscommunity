import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

type AuthPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  redirectTo: string;
  suggestedRole: 'student' | 'teacher';
  actionLabel: string;
};

function withRedirect(path: string, redirectTo: string) {
  return `${path}${path.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(redirectTo)}`;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  title,
  description,
  redirectTo,
  suggestedRole,
  actionLabel,
}: AuthPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-elios-navy">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-elios-navy">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link to={withRedirect(`/register?role=${suggestedRole}`, redirectTo)} className="rounded-lg bg-elios-yellow px-4 py-3 text-center text-sm font-bold text-elios-navy hover:bg-yellow-300">
            {actionLabel}
          </Link>
          <Link to={withRedirect('/login', redirectTo)} className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-bold text-elios-navy hover:bg-slate-50">
            Connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
