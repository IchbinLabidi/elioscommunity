import { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';

export default function FileUploadField({
  label,
  helper,
  accept,
  file,
  onChange,
}: {
  label: string;
  helper: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
  };

  return (
    <label className="block rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm">
      <span className="flex items-center gap-2 font-semibold text-elios-navy">
        <Upload className="h-4 w-4 text-elios-blue" />
        {label}
      </span>
      <span className="mt-1 block text-xs text-slate-500">{helper}</span>
      <input type="file" accept={accept} onChange={handleChange} className="mt-3 w-full text-sm text-slate-600" />
      {file ? <span className="mt-2 block rounded-md bg-elios-sky px-3 py-2 text-xs font-semibold text-elios-blue">{file.name}</span> : null}
    </label>
  );
}
