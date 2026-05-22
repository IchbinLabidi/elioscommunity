import { Download, FileText } from 'lucide-react';
import { ChapterAttachment } from '../types/database';

function fileSize(size?: number | null) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentCard({ attachment }: { attachment: ChapterAttachment }) {
  return (
    <a href={attachment.file_url ?? '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <span className="inline-flex items-center gap-2 font-semibold text-elios-navy">
        <FileText className="h-4 w-4 text-elios-blue" />
        {attachment.title}
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
        {attachment.file_type || fileSize(attachment.file_size)}
        <Download className="h-4 w-4" />
      </span>
    </a>
  );
}
