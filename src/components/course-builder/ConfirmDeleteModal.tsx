import BuilderModal from './BuilderModal';

type Props = {
  title: string;
  message: string;
  error?: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({ title, message, error, busy, onClose, onConfirm }: Props) {
  return (
    <BuilderModal
      title={title}
      subtitle="Cette action est irréversible."
      busy={busy}
      onClose={onClose}
      width="md"
      footer={(
        <>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-bold text-brand-navy">Annuler</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            {busy ? 'Suppression...' : 'Supprimer'}
          </button>
        </>
      )}
    >
      <p className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">{message}</p>
      {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </BuilderModal>
  );
}
