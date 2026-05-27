import { UploadProgressState } from '../hooks/useUploadWithProgress';
import UploadDropzone from './upload/UploadDropzone';

export default function AvatarUpload({
  previewUrl,
  file,
  onChange,
  progress,
  onCancel,
  onRetry,
}: {
  previewUrl?: string | null;
  file?: File | null;
  onChange: (file: File | null) => void;
  progress?: UploadProgressState;
  onCancel?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <img src={previewUrl || 'https://api.dicebear.com/8.x/initials/svg?seed=Teacher'} alt="" className="h-20 w-20 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <UploadDropzone
          label="Photo de profil"
          helper="JPG, PNG ou WebP. Maximum 5 Mo."
          accept="image/jpeg,image/jpg,image/png,image/webp"
          file={file ?? null}
          onChange={onChange}
          progress={progress}
          onCancel={onCancel}
          onRetry={onRetry}
          compact
        />
      </div>
    </div>
  );
}
