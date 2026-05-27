import { UploadProgressState } from '../hooks/useUploadWithProgress';
import UploadDropzone from './upload/UploadDropzone';

export default function PaymentProofUpload({
  file,
  onChange,
  progress,
  onCancel,
  onRetry,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  progress?: UploadProgressState;
  onCancel?: () => void;
  onRetry?: () => void;
}) {
  return (
    <UploadDropzone
      label="Preuve de paiement"
      helper="JPG, PNG, WebP ou PDF. Maximum 10 Mo."
      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
      file={file}
      onChange={onChange}
      progress={progress}
      onCancel={onCancel}
      onRetry={onRetry}
    />
  );
}
