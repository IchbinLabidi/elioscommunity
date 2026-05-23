import { FileText, FileVideo, FolderOpen, Link2 } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ContentVisibilityModal from '../components/admin/ContentVisibilityModal';
import CourseAdminBadges from '../components/admin/CourseAdminBadges';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  AdminCourseSummary,
  CourseContentTarget,
  getAdminCourseById,
  getAdminCourseContent,
  hideAttachment,
  hideChapter,
  hideVideo,
  unhideAttachment,
  unhideChapter,
  unhideVideo,
} from '../services/adminCoursesService';
import { ChapterAttachment, ChapterVideo, CourseChapter, CourseWithContent } from '../types/database';

type Target = { type: CourseContentTarget; id: string; title: string; visible: boolean };

export default function AdminCourseContentPage() {
  const { courseId = '' } = useParams();
  const [course, setCourse] = useState<AdminCourseSummary | null>(null);
  const [content, setContent] = useState<CourseWithContent | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCourse, nextContent] = await Promise.all([
        getAdminCourseById(courseId),
        getAdminCourseContent(courseId),
      ]);
      setCourse(nextCourse);
      setContent(nextContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le contenu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [courseId]);

  const moderate = async (reason: string) => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      if (target.type === 'chapter') await (target.visible ? hideChapter(target.id, reason) : unhideChapter(target.id));
      if (target.type === 'video') await (target.visible ? hideVideo(target.id, reason) : unhideVideo(target.id));
      if (target.type === 'attachment') await (target.visible ? hideAttachment(target.id, reason) : unhideAttachment(target.id));
      setNotice(target.visible ? 'Le contenu est maintenant masque.' : 'Le contenu est de nouveau visible.');
      setTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du contenu" />;
  if (!course || !content) {
    return (
      <section className="space-y-5">
        <BackButton label="Retour aux cours" fallbackTo="/admin/courses" />
        <p className="rounded-xl bg-red-50 p-5 text-sm text-red-700">Ce cours est introuvable.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <BackButton label="Retour au cours" fallbackTo={`/admin/courses/${course.id}`} />
      <header className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <CourseAdminBadges course={course} />
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Inspection du contenu</p>
            <h1 className="mt-2 text-3xl font-black text-brand-navy">{course.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{course.chaptersCount} chapitres, {course.videosCount} videos, {course.attachmentsCount} fichiers</p>
          </div>
          <Link to={`/admin/courses/${course.id}`} className="rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white">
            Voir le dossier du cours
          </Link>
        </div>
      </header>

      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}

      {content.chapters.length ? content.chapters.map((chapter) => (
        <ChapterCard
          key={chapter.id}
          chapter={chapter}
          onSelect={setTarget}
        />
      )) : (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center text-sm text-slate-500">
          Aucun chapitre n'a ete ajoute a ce cours.
        </div>
      )}

      {target ? (
        <ContentVisibilityModal
          open
          visible={target.visible}
          title={target.title}
          busy={busy}
          onClose={() => setTarget(null)}
          onConfirm={moderate}
        />
      ) : null}
    </section>
  );
}

function ChapterCard({ chapter, onSelect }: { chapter: CourseChapter & { videos: ChapterVideo[]; attachments: ChapterAttachment[] }; onSelect: (target: Target) => void }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FolderOpen className="h-5 w-5 text-brand-orange" />
            <h2 className="font-black text-brand-navy">Chapitre {chapter.chapter_order} - {chapter.title}</h2>
            <VisibilityBadge hidden={Boolean(chapter.is_hidden)} />
            {chapter.is_free_preview ? <SmallBadge label="Apercu gratuit" tone="orange" /> : null}
            <SmallBadge label={chapter.is_published ? 'Publie' : 'Brouillon'} tone={chapter.is_published ? 'green' : 'slate'} />
          </div>
          {chapter.description ? <p className="mt-2 text-sm text-slate-600">{chapter.description}</p> : null}
        </div>
        <ModerateButton hidden={Boolean(chapter.is_hidden)} onClick={() => onSelect({ type: 'chapter', id: chapter.id, title: chapter.title, visible: !chapter.is_hidden })} />
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <MediaPanel icon={<FileVideo className="h-5 w-5" />} title="Videos" empty="Aucune video.">
          {chapter.videos.map((video) => (
            <VideoItem key={video.id} video={video} onSelect={onSelect} />
          ))}
        </MediaPanel>
        <MediaPanel icon={<FileText className="h-5 w-5" />} title="Fichiers" empty="Aucun fichier.">
          {chapter.attachments.map((attachment) => (
            <AttachmentItem key={attachment.id} attachment={attachment} onSelect={onSelect} />
          ))}
        </MediaPanel>
      </div>
    </article>
  );
}

function VideoItem({ video, onSelect }: { video: ChapterVideo; onSelect: (target: Target) => void }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm font-bold text-brand-navy">{video.title}</p>
        <VisibilityBadge hidden={Boolean(video.is_hidden)} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{video.duration_seconds ? `${Math.round(video.duration_seconds / 60)} min` : 'Duree non indiquee'} - {video.is_published ? 'Publiee' : 'Brouillon'}</p>
      <div className="mt-3 flex gap-2">
        {video.video_url ? <a href={video.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy"><Link2 className="h-3.5 w-3.5" />Previsualiser</a> : null}
        <ModerateButton compact hidden={Boolean(video.is_hidden)} onClick={() => onSelect({ type: 'video', id: video.id, title: video.title, visible: !video.is_hidden })} />
      </div>
    </div>
  );
}

function AttachmentItem({ attachment, onSelect }: { attachment: ChapterAttachment; onSelect: (target: Target) => void }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm font-bold text-brand-navy">{attachment.title}</p>
        <VisibilityBadge hidden={Boolean(attachment.is_hidden)} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{attachment.file_type || 'Fichier'} - {attachment.is_published ? 'Publie' : 'Brouillon'}</p>
      <div className="mt-3 flex gap-2">
        {attachment.file_url ? <a href={attachment.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy"><Link2 className="h-3.5 w-3.5" />Ouvrir</a> : null}
        <ModerateButton compact hidden={Boolean(attachment.is_hidden)} onClick={() => onSelect({ type: 'attachment', id: attachment.id, title: attachment.title, visible: !attachment.is_hidden })} />
      </div>
    </div>
  );
}

function MediaPanel({ title, icon, children, empty }: { title: string; icon: ReactNode; children: ReactNode[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h3 className="inline-flex items-center gap-2 text-sm font-black uppercase text-brand-navy">{icon}{title}</h3>
      {children.length ? children : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

function ModerateButton({ hidden, compact = false, onClick }: { hidden: boolean; compact?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`${compact ? 'text-xs' : 'px-3 py-2 text-sm'} rounded-xl border border-brand-border font-bold text-brand-navy`}>{hidden ? 'Restaurer' : 'Masquer'}</button>;
}
function VisibilityBadge({ hidden }: { hidden: boolean }) {
  return <SmallBadge label={hidden ? 'Masque' : 'Visible'} tone={hidden ? 'orange' : 'green'} />;
}
function SmallBadge({ label, tone }: { label: string; tone: 'green' | 'orange' | 'slate' }) {
  const style = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'orange' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${style}`}>{label}</span>;
}
