import {
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Lock,
  Menu,
  Play,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AttachmentCard from '../components/AttachmentCard';
import { PageContainer } from '../components/layout/PageContainer';
import BackButton from '../components/navigation/BackButton';
import StudentLiveSessionsPanel from '../components/live/StudentLiveSessionsPanel';
import VideoComments from '../components/learning/VideoComments';
import VideoNotes from '../components/learning/VideoNotes';
import VideoPlayer from '../components/learning/VideoPlayer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getCourseAccess } from '../services/enrollmentsService';
import { getCourseLearningContent, getCourseProgressSummary, updateVideoProgress } from '../services/videoLearningService';
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
  const [completedLessons, setCompletedLessons] = useState(0);
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastProgressSave = useRef(0);

  useEffect(() => {
    if (!courseId || authLoading) return;
    setLoading(true);
    setError('');
    Promise.all([getCourseLearningContent(courseId), getCourseAccess(courseId), getCourseProgressSummary(courseId)])
      .then(([content, access, progress]) => {
        setCourse(content);
        setHasAccess(access);
        setCompletedLessons(progress?.completedLessons ?? 0);
        setCompletedVideoIds(progress?.completedVideoIds ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger le contenu du cours.'))
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
  const progressPercent = videos.length ? Math.round((completedLessons / videos.length) * 100) : 0;
  const allAttachmentsCount = course?.chapters.reduce((total, chapter) => total + chapter.attachments.length, 0) ?? 0;
  const selectedCompleted = selected ? completedVideoIds.includes(selected.video.id) : false;

  function openVideo(item: FlatVideo | null) {
    if (!item || !courseId) return;
    setSelectedVideoId(item.video.id);
    setCurrentTime(null);
    setSeekTo(null);
    setStatusMessage('');
    setSidebarOpen(false);
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
    if (!selected || !course) return;
    try {
      await updateVideoProgress(selected.video.id, Math.floor(currentTime ?? selected.video.duration_seconds ?? 0), true);
      const progress = await getCourseProgressSummary(course.id);
      setCompletedLessons(progress?.completedLessons ?? completedLessons);
      setCompletedVideoIds(progress?.completedVideoIds ?? [...completedVideoIds, selected.video.id]);
      setStatusMessage('Leçon marquée comme terminée.');
    } catch {
      setStatusMessage('Impossible de marquer cette leçon comme terminée.');
    }
  }

  if (loading) return <PageContainer><LoadingSpinner label="Chargement du cours" /></PageContainer>;
  if (error || !course) return <PageContainer><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error || 'Impossible de charger le contenu du cours.'}</p></PageContainer>;

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f5f7fb] text-elios-navy">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <button type="button" onClick={() => setSidebarOpen(true)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm lg:hidden">
          <Menu className="h-4 w-4" />Chapitres
        </button>
        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Fermer la navigation" onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-slate-950/45" />
            <aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] overflow-y-auto bg-[#f5f7fb] p-4 shadow-2xl">
              <div className="mb-4 flex justify-end">
                <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-600 shadow-sm"><X className="h-5 w-5" /></button>
              </div>
              <CourseSidebar course={course} videos={videos} selectedVideoId={selectedVideoId} progressPercent={progressPercent} completedLessons={completedLessons} attachmentCount={allAttachmentsCount} onVideo={openVideo} onFiles={() => { setActiveTab('files'); setSidebarOpen(false); }} hasAccess={hasAccess} />
            </aside>
          </div>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-112px)] space-y-4 overflow-y-auto pr-1">
              <CourseSidebar course={course} videos={videos} selectedVideoId={selectedVideoId} progressPercent={progressPercent} completedLessons={completedLessons} attachmentCount={allAttachmentsCount} onVideo={openVideo} onFiles={() => setActiveTab('files')} hasAccess={hasAccess} />
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            <BackButton label="Retour au cours" fallbackTo={`/courses/${course.id}`} variant="outline" />

            {selected && selected.accessible ? (
              <>
                <div className="space-y-3">
                  <h1 className="text-2xl font-black leading-tight text-brand-navy sm:text-3xl">{selected.video.title}</h1>

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-slate-950">
                      <VideoPlayer video={selected.video} course={course} seekToSeconds={seekTo} onTimeUpdate={handleTimeUpdate} />
                    </div>
                    <div className="border-t border-slate-100 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-brand-orange">Chapitre {selected.chapter.chapter_order}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Leçon</span>
                          <span className="font-semibold">Leçon {selected.lessonNumber} sur {videos.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:shrink-0">
                          <button type="button" aria-label="Enregistrer cette leçon" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-brand-navy hover:bg-slate-50">
                            <Bookmark className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={markComplete}
                            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm sm:flex-none ${selectedCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-orange text-white'}`}
                          >
                            <Check className="h-4 w-4" />{selectedCompleted ? 'Terminé' : 'Marquer comme terminé'}
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-slate-500">{course.title} / Chapitre {selected.chapter.chapter_order} / Leçon {selected.lessonNumber}</p>
                    </div>
                    {statusMessage ? <p className="mx-4 mb-4 rounded-xl bg-orange-50 p-3 text-sm font-bold text-brand-navy">{statusMessage}</p> : null}
                  </section>
                </div>

                <div className="xl:hidden">
                  <StudentLiveSessionsPanel courseId={course.id} hasAccess={Boolean(paid && hasAccess && profile?.role === 'student')} compact />
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <nav className="grid grid-cols-2 items-center gap-2 border-b border-slate-100 pb-4 sm:grid-cols-[auto_1fr_auto]">
                    <button type="button" onClick={() => openVideo(previous)} disabled={!previous} className="row-start-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-brand-navy disabled:cursor-not-allowed disabled:opacity-40 sm:row-start-1">
                      <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Leçon </span>précédente
                    </button>
                    <p className="col-span-2 row-start-1 text-center text-sm font-bold text-slate-500 sm:col-span-1 sm:col-start-2">Leçon {selected.lessonNumber} sur {videos.length}</p>
                    <button type="button" onClick={() => openVideo(next)} disabled={!next} className="row-start-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-brand-navy disabled:cursor-not-allowed disabled:opacity-40 sm:col-start-3 sm:row-start-1">
                      <span className="hidden sm:inline">Leçon </span>suivante<ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                  <div className="mt-4 flex gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1">
                    <TabButton active={activeTab === 'qa'} onClick={() => setActiveTab('qa')}>Discussion</TabButton>
                    <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Notes</TabButton>
                    <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')}>Fichiers</TabButton>
                  </div>
                  {activeTab === 'qa' ? <VideoComments embedded videoId={selected.video.id} currentUserId={session?.user.id} profile={profile} currentTime={currentTime} onSeek={handleSeek} /> : null}
                  {activeTab === 'notes' ? <VideoNotes embedded videoId={selected.video.id} profile={profile} currentTime={currentTime} onSeek={handleSeek} /> : null}
                  {activeTab === 'files' ? (
                    <div className="pt-4">
                      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-black text-brand-navy"><FileText className="h-5 w-5 text-brand-orange" />Fichiers de la leçon</h2>
                      {selectedChapterAttachments.length ? (
                        <div className="space-y-2">{selectedChapterAttachments.map((attachment: ChapterAttachment) => <AttachmentCard key={attachment.id} attachment={attachment} />)}</div>
                      ) : (
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Aucun fichier disponible pour cette leçon.</p>
                      )}
                    </div>
                  ) : null}
                </section>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <Lock className="mx-auto h-12 w-12 text-brand-orange" />
                <h2 className="mt-4 text-2xl font-black text-brand-navy">Cette vidéo est verrouillée</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">Inscrivez-vous pour accéder au programme complet. Les chapitres en aperçu restent disponibles avant validation.</p>
                {paid ? <Link to={`/courses/${course.id}/enroll`} className="mt-6 inline-flex rounded-xl bg-brand-orange px-5 py-3 font-bold text-white">S'inscrire au cours</Link> : null}
              </div>
            )}
          </main>

          <aside className="hidden min-w-0 xl:block">
            <div className="sticky top-24 space-y-4">
              <StudyPanel progressPercent={progressPercent} completedLessons={completedLessons} lessonCount={videos.length} attachmentCount={allAttachmentsCount} onFiles={() => setActiveTab('files')}>
                <StudentLiveSessionsPanel courseId={course.id} hasAccess={Boolean(paid && hasAccess && profile?.role === 'student')} compact />
              </StudyPanel>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`h-10 shrink-0 rounded-lg px-4 text-sm font-bold transition ${active ? 'bg-brand-navy text-white shadow-sm' : 'text-slate-500 hover:text-brand-navy'}`}>
      {children}
    </button>
  );
}

type CourseSidebarProps = {
  course: CourseWithContent;
  videos: FlatVideo[];
  selectedVideoId: string | null;
  progressPercent: number;
  completedLessons: number;
  attachmentCount: number;
  hasAccess: boolean;
  onVideo: (item: FlatVideo) => void;
  onFiles: () => void;
};

function CourseSidebar({ course, videos, selectedVideoId, progressPercent, completedLessons, attachmentCount, hasAccess, onVideo, onFiles }: CourseSidebarProps) {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {course.cover_url ? <img src={course.cover_url} alt="" className="h-24 w-full object-cover" /> : null}
        <div className="p-4">
          <p className="text-xs font-black uppercase text-brand-orange">{course.subject}</p>
          <h2 className="mt-2 text-lg font-black leading-snug text-brand-navy">{course.title}</h2>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <h2 className="font-bold text-brand-navy">Progression</h2>
          <span className="font-black text-brand-orange">{progressPercent}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-orange transition-all" style={{ width: `${progressPercent}%` }} /></div>
        <p className="mt-3 text-xs font-semibold text-slate-500">{completedLessons} sur {videos.length} leçons terminées</p>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
          <BookOpen className="h-4 w-4 text-brand-orange" /><h2 className="text-sm font-black text-brand-navy">Chapitres</h2><ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
        </div>
        <div className="space-y-4 p-3">
          {course.chapters.map((chapter) => {
            const chapterAccessible = Number(course.price) <= 0 || hasAccess || chapter.is_free_preview;
            return (
              <div key={chapter.id}>
                <p className="px-2 pb-2 text-xs font-bold text-slate-500">Chapitre {chapter.chapter_order} · {chapter.title}</p>
                <div className="space-y-1">
                  {chapter.videos.length ? chapter.videos.map((video) => {
                    const item = videos.find((entry) => entry.video.id === video.id);
                    const active = video.id === selectedVideoId;
                    return (
                      <button key={video.id} type="button" onClick={() => item && onVideo(item)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-navy'}`}>
                        {chapterAccessible ? <Play className={`h-4 w-4 shrink-0 ${active ? 'text-brand-orange' : 'text-slate-400'}`} /> : <Lock className="h-4 w-4 shrink-0 text-slate-400" />}
                        <span className="min-w-0 flex-1 truncate font-semibold">{video.title}</span>
                        {video.duration_seconds ? <span className={`text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{Math.ceil(video.duration_seconds / 60)}m</span> : null}
                      </button>
                    );
                  }) : <p className="px-3 py-2 text-xs text-slate-400">Aucune vidéo.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <button type="button" onClick={onFiles} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-200">
        <span className="rounded-xl bg-orange-50 p-2.5 text-brand-orange"><Download className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block text-sm font-bold text-brand-navy">Ressources</span><span className="block text-xs text-slate-500">{attachmentCount} fichier(s) disponible(s)</span></span>
      </button>
    </div>
  );
}

function StudyPanel({ children, progressPercent, completedLessons, lessonCount, attachmentCount, onFiles }: { children: ReactNode; progressPercent: number; completedLessons: number; lessonCount: number; attachmentCount: number; onFiles: () => void }) {
  return (
    <section className="space-y-4">
      <h2 className="px-1 text-lg font-black text-brand-navy">Espace d'étude</h2>
      {children}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-between text-sm font-bold text-brand-navy"><span>Progression</span><span>{progressPercent}%</span></div>
        <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-orange" style={{ width: `${progressPercent}%` }} /></div>
        <p className="mt-3 text-xs text-slate-500">{completedLessons} sur {lessonCount} leçons terminées</p>
      </div>
      <button type="button" onClick={onFiles} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-brand-navy shadow-sm hover:bg-slate-50">
        Ressources <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs text-brand-orange">{attachmentCount}</span>
      </button>
    </section>
  );
}
