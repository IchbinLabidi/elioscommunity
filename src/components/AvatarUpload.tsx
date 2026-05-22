export default function AvatarUpload({
  previewUrl,
  onChange,
}: {
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <img src={previewUrl || 'https://api.dicebear.com/8.x/initials/svg?seed=Teacher'} alt="" className="h-20 w-20 rounded-lg object-cover" />
      <label className="block text-sm font-semibold text-elios-navy">
        Avatar
        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-slate-600" />
      </label>
    </div>
  );
}
