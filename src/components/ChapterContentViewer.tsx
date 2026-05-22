import { PlayCircle } from 'lucide-react';
import { Course, CourseChapterWithContent } from '../types/database';
import AttachmentCard from './AttachmentCard';
import LockedContentCard from './LockedContentCard';
import VideoPlayer from './VideoPlayer';

export default function ChapterContentViewer({ course, chapter, hasFullAccess = false }: { course: Course; chapter: CourseChapterWithContent; hasFullAccess?: boolean }) {
  const accessible = Number(course.price) === 0 || chapter.is_free_preview || hasFullAccess;
  if (!accessible) return <LockedContentCard whatsapp={course.contact_whatsapp} />;

  return (
    <div className="mt-4 space-y-3">
      {chapter.videos.length ? chapter.videos.map((video) => (
        <div key={video.id} className="space-y-2">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-elios-navy"><PlayCircle className="h-4 w-4 text-elios-blue" />{video.title}</p>
          {video.description ? <p className="text-sm text-slate-600">{video.description}</p> : null}
          {video.video_url ? <VideoPlayer url={video.video_url} title={video.title} /> : null}
        </div>
      )) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No videos in this chapter yet.</p>}
      {chapter.attachments.length ? (
        <div className="space-y-2">
          {chapter.attachments.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} />)}
        </div>
      ) : null}
    </div>
  );
}
