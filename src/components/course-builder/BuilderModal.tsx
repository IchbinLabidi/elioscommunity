import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  busy?: boolean;
  width?: 'md' | 'lg';
};

export default function BuilderModal({ title, subtitle, children, footer, onClose, busy = false, width = 'lg' }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onCloseRef.current();
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-dialog-title"
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-brand-border bg-white shadow-2xl sm:rounded-2xl ${width === 'md' ? 'sm:max-w-lg' : 'sm:max-w-2xl'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-brand-border px-5 py-5 sm:px-6">
          <div>
            <h2 id="builder-dialog-title" className="text-xl font-black text-brand-navy">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        <footer className="flex flex-col-reverse gap-3 border-t border-brand-border bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {footer}
        </footer>
      </div>
    </div>
  );
}
