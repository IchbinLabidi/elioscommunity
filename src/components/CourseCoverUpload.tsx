import { UploadProgressState } from '../hooks/useUploadWithProgress';
import UploadDropzone from './upload/UploadDropzone';

export default function CourseCoverUpload({
  file,
  previewUrl,
  onChange,
  progress,
  onCancel,
  onRetry,
}: {
  file?: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  progress?: UploadProgressState;
  onCancel?: () => void;
  onRetry?: () => void;
}) {
  return (
    <UploadDropzone
      label="Image de couverture"
      helper="Image recommandee : JPG, PNG ou WebP, 1280x720 minimum."
      accept="image/jpeg,image/jpg,image/png,image/webp"
      file={file ?? null}
      previewUrl={previewUrl}
      onChange={onChange}
      progress={progress}
      onCancel={onCancel}
      onRetry={onRetry}
    />
  );
}
