import { Check, X } from 'lucide-react';

export default function EnrollmentReviewActions({
  disabled,
  onApprove,
  onReject,
}: {
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={disabled} onClick={onApprove} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
        <Check className="h-4 w-4" />
        Approve
      </button>
      <button disabled={disabled} onClick={onReject} className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-60">
        <X className="h-4 w-4" />
        Reject
      </button>
    </div>
  );
}
