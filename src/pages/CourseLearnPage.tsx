import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Play,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AttachmentCard from '../components/AttachmentCard';
import VideoComments from '../components/learning/VideoComments';
import VideoNotes from '../components/learning/VideoNotes';
import VideoPlayer from '../components/learning/VideoPlayer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getCourseAccess } from '../services/enrollmentsService';
import { getCourseLearningContent, updateVideoProgress } from '../services/videoLearningService';
import { ChapterAttachment, ChapterVideo, CourseChapterWithContent, CourseWithContent } from '../types/database';

type FlatVideo = {
  video: ChapterVideo;
  chapter: CourseChapterWithContent;
  lessonNumber: number;
  accessible: boolean;
};

type LearningTab = 'qa' | 'notes' | 'files';

export default function CourseLearnPage() {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const { loading: authLoading, session, profile } = useAuth();
  const [course, setCourse] = useState<CourseWithContent | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoId ?? null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<LearningTab>('qa');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastProgressSave = useRef(0);

  useEffect(() => {
    if (!courseId || authLoading) return;
    setLoading(true);
    setError('');
    Promise.all([getCourseLearningContent(courseId), getCourseAccess(courseId)])
      .then(([content, access]) => {
        setCourse(content);
        setHasAccess(access);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load course learning area.'))
      .finally(() => setLoading(false));
  }, [authLoading, courseId, profile?.role, session?.user.id]);

  const videos = useMemo<FlatVideo[]>(() => {
    if (!course) return [];
    let lessonNumber = 0;
    return course.chapters.flatMap((chapter) => {
      const accessible = Number(course.price) <= 0 || hasAccess || chapter.is_free_preview;
      return chapter.videos.map((video) => {
        lessonNumber += 1;
        return { video, chapter, lessonNumber, accessible };
      });
    });
  }, [course, hasAccess]);

  useEffect(() => {
    if (!videos.length) return;
    const current = videoId ?? selectedVideoId;
    const selected = videos.find((item) => item.video.id === current && item.accessible);
    const fallback = videos.find((item) => item.accessible) ?? videos[0];
    const nextId = selected?.video.id ?? fallback.video.id;
    setSelectedVideoId(nextId);
    if (courseId && nextId && videoId !== nextId) {
      navigate(`/courses/${courseId}/learn/videos/${nextId}`, { replace: true });
    }
  }, [courseId, navigate, selectedVideoId, videoId, videos]);

  const selectedIndex = videos.findIndex((item) => item.video.id === selectedVideoId);
  const selected = selectedIndex >= 0 ? videos[selectedIndex] : null;
  const previous = selectedIndex > 0 ? videos[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 && selectedIndex < videos.length - 1 ? videos[selectedIndex + 1] : null;
  const selectedChapterAttachments = selected?.chapter.attachments ?? [];
  const paid = course ? Number(course.price) > 0 : false;
  const progressPercent = 0;

  function openVideo(item: FlatVideo | null) {
    if (!item || !courseId) return;
    setSelectedVideoId(item.video.id);
    setCurrentTime(null);
    setSeekTo(null);
    setStatusMessage('');
    navigate(`/courses/${courseId}/learn/videos/${item.video.id}`);
  }

  function handleSeek(seconds: number) {
    setSeekTo(seconds);
    setCurrentTime(seconds);
  }

  function handleTimeUpdate(seconds: number) {
    setCurrentTime(seconds);
    if (profile?.role !== 'student' || !selected) return;
    if (seconds - lastProgressSave.current < 15) return;
    lastProgressSave.current = seconds;
    updateVideoProgress(selected.video.id, seconds, false).catch(() => undefined);
  }

  async function markComplete() {
    if (!selected) return;
    try {
      await updateVideoProgress(selected.video.id, Math.floor(currentTime ?? selected.video.duration_seconds ?? 0), true);
      setStatusMessage('Lesson marked complete.');
    } catch {
      setStatusMessage('Could not mark this lesson complete.');
    }
  }

  if (loading) return <LoadingSpinner label="Loading course learning area" />;
  if (error || !course) return <p className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || 'Course not found.'}</p>;

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f7f6fb] text-elios-navy">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-7 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:overflow-y-auto lg:pr-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">{course.subject}</p>
            <h1 className="mt-2 text-2xl font-black">{course.title}</h1>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Your progress</span>
              <span className="font-black">{progressPercent}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-elios-yellow" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-sm font-bold">{progressPercent} of {videos.length} lessons complete</p>
          </div>

          <div className="space-y-4">
            <section>
                <div className="flex items-center justify-between rounded-lg bg-elios-navy px-5 py-4 text-white shadow-sm">
                  <div className="flex items-center gap-6">
                    <span className="font-black">01</span>
                    <h2 className="font-black">Chapters</h2>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </div>

                <div className="ml-14 border-l border-slate-200 py-3">
                  {course.chapters.map((chapter) => {
                    const chapterAccessible = Number(course.price) <= 0 || hasAccess || chapter.is_free_preview;
                    return (
                      <div key={chapter.id} className="space-y-2 py-1 pl-5">
                        {chapter.videos.length ? chapter.videos.map((video) => {
                          const active = video.id === selectedVideoId;
                          return (
                            <button
                              key={video.id}
                              type="button"
                              onClick={() => openVideo({
                                video,
                                chapter,
                                accessible: chapterAccessible,
                                lessonNumber: videos.find((item) => item.video.id === video.id)?.lessonNumber ?? 1,
                              })}
                              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-bold transition ${active ? 'text-elios-navy' : 'text-slate-500 hover:text-elios-blue'}`}
                            >
                              {chapterAccessible ? <Play className={`h-4 w-4 shrink-0 ${active ? 'text-elios-blue' : 'text-amber-700'}`} /> : <Lock className="h-4 w-4 shrink-0" />}
                              <span className="line-clamp-1">{video.title}</span>
                            </button>
                          );
                        }) : (
                          <p className="py-2 text-sm font-semibold text-slate-400">No videos yet.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
          </div>

          <div className="rounded-r-lg bg-slate-200 px-5 py-4 text-xs font-black uppercase tracking-[0.24em]">
            Download resources
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm">
            <ArrowLeft className="h-4 w-4" />Back to courses
          </Link>

          {selected && selected.accessible ? (
            <>
              <div className="overflow-hidden rounded-xl border-[6px] border-slate-950 bg-slate-950 shadow-soft">
                <VideoPlayer video={selected.video} course={course} seekToSeconds={seekTo} onTimeUpdate={handleTimeUpdate} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                <div>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-800">
                      Chapter {selected.chapter.chapter_order}
                    </span>
                    <span className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Lesson
                    </span>
                  </div>
                  <h2 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{selected.video.title}</h2>
                  <p className="mt-4 text-xl font-black">
                    Lesson {selected.lessonNumber} of {videos.length}
                    {selected.video.duration_seconds ? `: ${Math.ceil(selected.video.duration_seconds / 60)} min` : ''}
                  </p>
                  {selected.video.description ? <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-700">{selected.video.description}</p> : null}
                  {statusMessage ? <p className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm font-bold text-elios-navy">{statusMessage}</p> : null}
                </div>
                <div className="flex gap-3">
                  <button type="button" className="grid h-14 w-14 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm">
                    <Bookmark className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={markComplete} className="inline-flex h-14 items-center gap-2 rounded-lg bg-amber-500 px-6 font-black text-elios-navy shadow-sm">
                    <Check className="h-5 w-5" />Mark complete
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
                <button type="button" onClick={() => setActiveTab('qa')} className={`px-1 pb-3 text-sm font-black ${activeTab === 'qa' ? 'border-b-2 border-amber-500 text-elios-navy' : 'text-slate-500'}`}>
                  Q/A
                </button>
                <button type="button" onClick={() => setActiveTab('notes')} className={`px-5 pb-3 text-sm font-black ${activeTab === 'notes' ? 'border-b-2 border-amber-500 text-elios-navy' : 'text-slate-500'}`}>
                  Notes
                </button>
                <button type="button" onClick={() => setActiveTab('files')} className={`px-5 pb-3 text-sm font-black ${activeTab === 'files' ? 'border-b-2 border-amber-500 text-elios-navy' : 'text-slate-500'}`}>
                  Files
                </button>
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => openVideo(previous)} disabled={!previous} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                    <ChevronLeft className="h-4 w-4" />Prev
                  </button>
                  <button type="button" onClick={() => openVideo(next)} disabled={!next} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                    Next<ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {activeTab === 'qa' ? (
                <VideoComments videoId={selected.video.id} currentUserId={session?.user.id} profile={profile} currentTime={currentTime} onSeek={handleSeek} />
              ) : null}
              {activeTab === 'notes' ? (
                <VideoNotes videoId={selected.video.id} profile={profile} currentTime={currentTime} onSeek={handleSeek} />
              ) : null}
              {activeTab === 'files' ? (
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 inline-flex items-center gap-2 font-black"><FileText className="h-5 w-5 text-elios-blue" />Lesson files</h3>
                  {selectedChapterAttachments.length ? (
                    <div className="space-y-2">{selectedChapterAttachments.map((attachment: ChapterAttachment) => <AttachmentCard key={attachment.id} attachment={attachment} />)}</div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No files have been attached to this chapter.</p>
                  )}
                </section>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Lock className="mx-auto h-12 w-12 text-elios-blue" />
              <h2 className="mt-4 text-3xl font-black">This video is locked</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">Enroll to access the full video curriculum. Free preview chapters remain available before approval.</p>
              {paid ? <Link to={`/courses/${course.id}/enroll`} className="mt-6 inline-flex rounded-lg bg-elios-yellow px-5 py-3 font-black text-elios-navy">Enroll to access this video</Link> : null}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
