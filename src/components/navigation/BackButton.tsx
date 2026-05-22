import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cx } from '../../lib/utils';

type BackButtonProps = {
  label?: string;
  fallbackTo?: string;
  className?: string;
  variant?: 'ghost' | 'outline' | 'solid';
};

const variantClasses = {
  ghost: 'text-slate-700 hover:bg-slate-100',
  outline: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  solid: 'bg-elios-navy text-white shadow-sm hover:bg-elios-blue',
};

export default function BackButton({
  label = 'Back',
  fallbackTo = '/',
  className = '',
  variant = 'ghost',
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    const hasBrowserHistory = typeof window !== 'undefined' && window.history.length > 1;
    if (hasBrowserHistory) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace: location.pathname === fallbackTo });
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={goBack}
      className={cx(
        'inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
        variantClasses[variant],
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
