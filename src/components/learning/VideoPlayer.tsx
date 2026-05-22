import { ExternalLink, PlayCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ChapterVideo, Course } from '../../types/database';
import { getEmbeddableVideoUrl, getVideoSourceType } from '../../utils/video';

type Props = {
  video: ChapterVideo;
  course: Course;
  seekToSeconds?: number | null;
  onTimeUpdate?: (seconds: number) => void;
  onReady?: () => void;
};

export default function VideoPlayer({ video, course, seekToSeconds, onTimeUpdate, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const url = video.video_url ?? '';
  const sourceType = getVideoSourceType(url);

  useEffect(() => {
    if (sourceType !== 'html5' || seekToSeconds === null || seekToSeconds === undefined) return;
    if (videoRef.current) {
      videoRef.current.currentTime = seekToSeconds;
      videoRef.current.play().catch(() => undefined);
    }
  }, [seekToSeconds, sourceType]);

  if (!url) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
        No video source has been added yet.
      </div>
    );
  }

  if (sourceType === 'html5') {
    return (
      <div className="overflow-hidden rounded-lg bg-slate-950 shadow-sm">
        <video
          ref={videoRef}
          controls
          className="aspect-video w-full bg-black"
          preload="metadata"
          poster={course.cover_url ?? undefined}
          onLoadedMetadata={onReady}
          onTimeUpdate={(event) => onTimeUpdate?.(event.currentTarget.currentTime)}
        >
          <source src={url} />
        </video>
      </div>
    );
  }

  if (sourceType === 'youtube' || sourceType === 'vimeo' || sourceType === 'iframe') {
    return (
      <div className="overflow-hidden rounded-lg bg-slate-950 shadow-sm">
        <iframe
          title={video.title}
          src={getEmbeddableVideoUrl(url)}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={onReady}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="flex items-center gap-2 font-bold text-elios-navy">
        <PlayCircle className="h-5 w-5 text-elios-blue" />
        This video source cannot be embedded safely.
      </div>
      <p className="mt-2 text-slate-600">You can open it in a new tab and keep this learning page beside it.</p>
      <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-elios-navy px-4 py-2 font-bold text-white">
        Open video
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
