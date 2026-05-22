export default function CourseCoverUpload({
  previewUrl,
  onChange,
}: {
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-elios-navy">
      Cover image
      {previewUrl ? <img src={previewUrl} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" /> : null}
      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm" />
    </label>
  );
}
