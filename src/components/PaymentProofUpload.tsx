import { FileUp } from 'lucide-react';

export default function PaymentProofUpload({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block rounded-lg border border-dashed border-slate-300 bg-white p-5">
      <span className="inline-flex items-center gap-2 text-sm font-bold text-elios-navy">
        <FileUp className="h-5 w-5 text-elios-blue" />
        Upload payment proof
      </span>
      <span className="mt-2 block text-sm text-slate-500">JPG, PNG, WebP, or PDF. Maximum 10MB.</span>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="mt-4 block w-full text-sm"
      />
      {file ? <span className="mt-3 block text-sm font-semibold text-elios-blue">{file.name}</span> : null}
    </label>
  );
}
