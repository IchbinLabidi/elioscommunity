import { ExternalLink, PlayCircle } from 'lucide-react';

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

export default function VideoPlayer({ url, title }: { url: string; title: string }) {
  if (isDirectVideo(url)) {
    return (
      <video controls className="aspect-video w-full rounded-lg bg-black" preload="metadata">
        <source src={url} />
      </video>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-elios-blue"
    >
      <span className="inline-flex items-center gap-2">
        <PlayCircle className="h-5 w-5" />
        Watch video: {title}
      </span>
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
