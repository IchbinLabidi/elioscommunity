import { Download, FileText } from 'lucide-react';

export default function PdfResourceCard({ url, title }: { url: string; title: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-elios-blue"
    >
      <span className="inline-flex items-center gap-2">
        <FileText className="h-5 w-5" />
        View PDF: {title}
      </span>
      <Download className="h-4 w-4" />
    </a>
  );
}
