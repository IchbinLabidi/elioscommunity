import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  fieldLabel?: string;
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  resetKey?: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
};

export default function ActionDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  fieldLabel,
  placeholder,
  initialValue = '',
  required = false,
  danger = false,
  busy = false,
  error = '',
  resetKey = '',
  onClose,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [validation, setValidation] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    setValidation('');
  }, [initialValue, open, resetKey]);

  if (!open) return null;

  const submit = () => {
    if (fieldLabel && required && !value.trim()) {
      setValidation('Ce champ est obligatoire.');
      return;
    }
    setValidation('');
    void onConfirm(value.trim());
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="action-dialog-title" className="text-xl font-black text-brand-navy">{title}</h2>
            {message ? <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p> : null}
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose} disabled={busy} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"><X className="h-5 w-5" /></button>
        </div>
        {fieldLabel ? (
          <label htmlFor="action-dialog-value" className="mt-5 block text-sm font-bold text-brand-navy">
            {fieldLabel}{!required ? <span className="font-normal text-slate-400"> (optionnel)</span> : null}
            <textarea
              id="action-dialog-value"
              name="value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={3}
              placeholder={placeholder}
              className="mt-2 w-full rounded-xl border border-brand-border p-3 font-normal outline-none focus:border-brand-orange"
            />
          </label>
        ) : null}
        {validation || error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{validation || error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">{cancelLabel}</button>
          <button type="button" onClick={submit} disabled={busy} className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-60 ${danger ? 'bg-red-600' : 'bg-brand-navy'}`}>{busy ? 'Traitement...' : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
