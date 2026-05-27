import { UploadProgressState } from '../hooks/useUploadWithProgress';
import UploadDropzone from './upload/UploadDropzone';

export default function FileUploadField({
  label,
  helper,
  accept,
  file,
  onChange,
  progress,
  onCancel,
  onRetry,
}: {
  label: string;
  helper: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  progress?: UploadProgressState;
  onCancel?: () => void;
  onRetry?: () => void;
}) {
  return <UploadDropzone label={label} helper={helper} accept={accept} file={file} onChange={onChange} progress={progress} onCancel={onCancel} onRetry={onRetry} />;
}
