import { BookOpen, CircleCheck, ExternalLink, ImageIcon, Plus, Settings2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChapterBuilderCard from '../components/course-builder/ChapterBuilderCard';
import ChapterEditorModal from '../components/course-builder/ChapterEditorModal';
import ConfirmDeleteModal from '../components/course-builder/ConfirmDeleteModal';
import ResourceContentModal, { ResourceModalValues } from '../components/course-builder/ResourceContentModal';
import VideoContentModal, { VideoModalValues } from '../components/course-builder/VideoContentModal';
import DraftStatus from '../components/forms/DraftStatus';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import useUploadWithProgress from '../hooks/useUploadWithProgress';
import { getCourseById } from '../services/coursesService';
import {
  createAttachment,
  createChapter,
  createVideo,
  deleteAttachment,
  deleteChapter,
  deleteVideo,
  getCourseContentErrorMessage,
  getCourseContentForBuilder,
  updateAttachment,
  updateChapter,
  updateVideo,
} from '../services/courseContentService';
import { uploadAttachment, uploadVideo } from '../services/uploadService';
import { ChapterAttachment, ChapterVideo, CourseChapterWithContent, CourseWithContent } from '../types/database';

function devError(action: string, error: unknown) {
  if (import.meta.env.DEV) console.error(action, error);
}

type DeleteTarget = { kind: 'chapter' | 'video' | 'attachment'; id: string; title: string };

export default function CourseBuilderPage() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState<CourseWithContent | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [chapterError, setChapterError] = useState('');
  const [notice, setNotice] = useState('');
  const [chapterDialog, setChapterDialog] = useState<CourseChapterWithContent | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ chapter: CourseChapterWithContent; mode: 'link' | 'upload'; video?: ChapterVideo | null } | null>(null);
  const [resourceDialog, setResourceDialog] = useState<{ chapter: CourseChapterWithContent; attachment?: ChapterAttachment | null } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteTarget | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const videoUpload = useUploadWithProgress();
  const resourceUpload = useUploadWithProgress();
  const chapterDraft = useFormDraft({
    key: draftKey(profile?.id, `teacher:course-builder:${courseId ?? 'course'}:chapter-title`),
    values: { chapterTitle },
    onRestore: (values) => setChapterTitle(values.chapterTitle),
  });

  const load = async (showLoading = true) => {
    if (!courseId) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const courseData = await getCourseById(courseId);
      if (profile?.role === 'teacher' && courseData.teacher_id !== profile.id) throw new Error('COURSE_PERMISSION_DENIED');
      const content = await getCourseContentForBuilder(courseData);
      setCourse(content);
      setExpanded((current) => Object.keys(current).length ? current : content.chapters[0] ? { [content.chapters[0].id]: true } : {});
    } catch (caught) {
      devError('Load course builder failed', caught);
      setError(caught instanceof Error && caught.message === 'COURSE_PERMISSION_DENIED'
        ? 'Vous n’êtes pas autorisé à modifier ce cours.'
        : getCourseContentErrorMessage(caught, 'Impossible de charger la structure du cours.'));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [courseId, profile]);

  const nextChapterOrder = useMemo(() => Math.max(0, ...(course?.chapters.map((chapter) => chapter.chapter_order) ?? [])) + 1, [course]);
  const chapterCount = course?.chapters.length ?? 0;
  const videoCount = course?.chapters.reduce((total, chapter) => total + chapter.videos.length, 0) ?? 0;
  const fileCount = course?.chapters.reduce((total, chapter) => total + chapter.attachments.length, 0) ?? 0;

  const addChapter = async (event: FormEvent) => {
    event.preventDefault();
    setChapterError('');
    setNotice('');
    const title = chapterTitle.trim();
    if (!title) return setChapterError('Le titre du chapitre est obligatoire.');
    if (title.length < 3) return setChapterError('Le titre du chapitre doit contenir au moins 3 caractères.');
    if (!course) return setChapterError('Ce cours est introuvable.');
    setSaving(true);
    try {
      const created = await createChapter(course, { title, description: null, chapter_order: nextChapterOrder, is_free_preview: false, is_published: true });
      const chapter: CourseChapterWithContent = { ...created, videos: [], attachments: [] };
      setCourse((current) => current ? { ...current, chapters: [...current.chapters, chapter].sort((a, b) => a.chapter_order - b.chapter_order) } : current);
      setExpanded((current) => ({ ...current, [created.id]: true }));
      chapterDraft.clearDraft();
      setChapterTitle('');
      setNotice('Chapitre ajouté.');
    } catch (caught) {
      devError('Add chapter failed', caught);
      setChapterError(getCourseContentErrorMessage(caught, 'Impossible d’ajouter le chapitre. Vérifiez les permissions Supabase.'));
    } finally {
      setSaving(false);
    }
  };

  const perform = async (action: () => Promise<unknown>, fallback: string, success?: string) => {
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      await load(false);
    } catch (caught) {
      devError('Course builder action failed', caught);
      setError(getCourseContentErrorMessage(caught, fallback));
    }
  };

  const openChapterEditor = (chapter: CourseChapterWithContent) => {
    setModalError('');
    setChapterDialog(chapter);
  };

  const openVideoEditor = (chapter: CourseChapterWithContent, mode: 'link' | 'upload', video?: ChapterVideo) => {
    setModalError('');
    videoUpload.resetUpload();
    setVideoDialog({ chapter, mode, video });
  };

  const openResourceEditor = (chapter: CourseChapterWithContent, attachment?: ChapterAttachment) => {
    setModalError('');
    resourceUpload.resetUpload();
    setResourceDialog({ chapter, attachment });
  };

  const openDelete = (target: DeleteTarget) => {
    setModalError('');
    setDeleteDialog(target);
  };

  const saveChapter = async (values: { title: string; description: string; isPublished: boolean; isFreePreview: boolean }) => {
    if (!chapterDialog) return false;
    setModalBusy(true);
    setModalError('');
    try {
      await updateChapter(chapterDialog.id, {
        title: values.title.trim(),
        description: values.description.trim() || null,
        is_published: values.isPublished,
        is_free_preview: values.isFreePreview,
      });
      setChapterDialog(null);
      setNotice('Chapitre modifié.');
      await load(false);
      return true;
    } catch (caught) {
      devError('Update chapter failed', caught);
      setModalError(getCourseContentErrorMessage(caught, 'Impossible de modifier le chapitre.'));
      return false;
    } finally {
      setModalBusy(false);
    }
  };

  const saveVideo = async (values: VideoModalValues) => {
    if (!videoDialog || !course) return false;
    const { chapter, video } = videoDialog;
    setModalBusy(true);
    setModalError('');
    try {
      let videoUrl: string | null = values.sourceMode === 'link' ? values.videoUrl.trim() : video?.video_url ?? null;
      let videoPath: string | null = values.sourceMode === 'link' ? null : video?.video_path ?? null;
      if (values.file) {
        const uploaded = await videoUpload.uploadFile((options) => uploadVideo(values.file!, course.teacher_id, course.id, chapter.id, options));
        videoUrl = uploaded.publicUrl;
        videoPath = uploaded.path;
      }
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        video_url: videoUrl,
        video_path: videoPath,
        duration_seconds: values.durationMinutes ? Number(values.durationMinutes) * 60 : null,
        is_published: values.isPublished,
      };
      if (video) await updateVideo(video.id, payload);
      else await createVideo(chapter, { ...payload, video_order: Math.max(0, ...chapter.videos.map((item) => item.video_order)) + 1 });
      setVideoDialog(null);
      setNotice(video ? 'Vidéo modifiée.' : 'Vidéo ajoutée avec succès.');
      await load(false);
      return true;
    } catch (caught) {
      devError('Save video failed', caught);
      setModalError(getCourseContentErrorMessage(caught, video ? 'Impossible de modifier la vidéo.' : 'Impossible d’ajouter la vidéo.'));
      return false;
    } finally {
      setModalBusy(false);
    }
  };

  const saveResource = async (values: ResourceModalValues) => {
    if (!resourceDialog || !course) return false;
    const { chapter, attachment } = resourceDialog;
    setModalBusy(true);
    setModalError('');
    try {
      let fileData: Pick<ChapterAttachment, 'file_url' | 'file_path' | 'file_type' | 'file_size'> | null = null;
      if (values.file) {
        const uploaded = await resourceUpload.uploadFile((options) => uploadAttachment(values.file!, course.teacher_id, course.id, chapter.id, options));
        fileData = { file_url: uploaded.publicUrl, file_path: uploaded.path, file_type: values.file.type, file_size: values.file.size };
      }
      if (attachment) {
        await updateAttachment(attachment.id, { title: values.title.trim(), is_published: values.isPublished, ...(fileData ?? {}) });
      } else if (fileData) {
        await createAttachment(chapter, {
          title: values.title.trim(),
          ...fileData,
          attachment_order: Math.max(0, ...chapter.attachments.map((item) => item.attachment_order)) + 1,
          is_published: values.isPublished,
        });
      } else {
        setModalError('Veuillez sélectionner un fichier.');
        return false;
      }
      setResourceDialog(null);
      setNotice(attachment ? 'Ressource modifiée.' : 'Ressource ajoutée.');
      await load(false);
      return true;
    } catch (caught) {
      devError('Save resource failed', caught);
      setModalError(getCourseContentErrorMessage(caught, attachment ? 'Impossible de modifier cette ressource.' : 'Impossible d’ajouter cette ressource.'));
      return false;
    } finally {
      setModalBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    setModalBusy(true);
    setModalError('');
    try {
      if (deleteDialog.kind === 'chapter') await deleteChapter(deleteDialog.id);
      else if (deleteDialog.kind === 'video') await deleteVideo(deleteDialog.id);
      else await deleteAttachment(deleteDialog.id);
      setNotice(deleteDialog.kind === 'chapter' ? 'Chapitre supprimé.' : deleteDialog.kind === 'video' ? 'Vidéo supprimée.' : 'Ressource supprimée.');
      setDeleteDialog(null);
      await load(false);
    } catch (caught) {
      devError('Delete content failed', caught);
      setModalError(getCourseContentErrorMessage(caught, 'Impossible de supprimer ce contenu.'));
    } finally {
      setModalBusy(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du contenu du cours" />;
  if (!course) return <p className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">{error || 'Ce cours est introuvable.'}</p>;

  return (
    <section className="mx-auto max-w-[1240px] space-y-6 pb-10">
      <BuilderHeader course={course} />
      {notice ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-5">
          <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-brand-navy">Structure du cours</h2>
            <p className="mt-1 text-sm text-slate-600">Ajoutez des chapitres puis organisez les vidéos et ressources.</p>
            <form onSubmit={addChapter} className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
              <label htmlFor="chapter-title" className="text-sm font-bold text-brand-navy">Nouveau chapitre</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input id="chapter-title" value={chapterTitle} onChange={(event) => { setChapterTitle(event.target.value); setChapterError(''); }} placeholder="Exemple : Les sous programmes" className="h-12 min-w-0 flex-1 rounded-xl border border-brand-border bg-white px-4 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-orange-100" />
                <button disabled={saving || !chapterTitle.trim()} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus className="h-4 w-4" />{saving ? 'Ajout...' : 'Ajouter le chapitre'}
                </button>
              </div>
              {chapterError ? <p className="mt-3 text-sm font-semibold text-red-700">{chapterError}</p> : null}
              {chapterTitle.trim() ? <div className="mt-3">{chapterDraft.status === 'idle' ? <p className="text-xs font-semibold text-slate-500">Modifications non enregistrées</p> : <DraftStatus status={chapterDraft.status} lastSavedAt={chapterDraft.lastSavedAt} />}</div> : null}
            </form>
          </section>
          {course.chapters.length ? course.chapters.map((chapter) => (
            <ChapterBuilderCard
              key={chapter.id}
              chapter={chapter}
              open={Boolean(expanded[chapter.id])}
              onToggle={() => setExpanded((current) => ({ ...current, [chapter.id]: !current[chapter.id] }))}
              onAddVideo={() => openVideoEditor(chapter, 'link')}
              onAddResource={() => openResourceEditor(chapter)}
              onEditChapter={() => openChapterEditor(chapter)}
              onDeleteChapter={() => openDelete({ kind: 'chapter', id: chapter.id, title: chapter.title })}
              onTogglePreview={() => { void perform(() => updateChapter(chapter.id, { is_free_preview: !chapter.is_free_preview }), 'Impossible de modifier l’accès aperçu.'); }}
              onTogglePublished={() => { void perform(() => updateChapter(chapter.id, { is_published: !chapter.is_published }), 'Impossible de modifier la publication du chapitre.'); }}
              onEditVideo={(video) => openVideoEditor(chapter, video.video_path ? 'upload' : 'link', video)}
              onDeleteVideo={(video) => openDelete({ kind: 'video', id: video.id, title: video.title })}
              onEditAttachment={(attachment) => openResourceEditor(chapter, attachment)}
              onDeleteAttachment={(attachment) => openDelete({ kind: 'attachment', id: attachment.id, title: attachment.title })}
            />
          )) : <BuilderEmptyState focusInput={() => document.getElementById('chapter-title')?.focus()} />}
        </main>
        <BuilderSummary course={course} chapters={chapterCount} videos={videoCount} files={fileCount} lastSavedAt={chapterDraft.lastSavedAt} />
      </div>

      {chapterDialog ? (
        <ChapterEditorModal chapter={chapterDialog} busy={modalBusy} error={modalError} draftKey={draftKey(profile?.id, 'teacher:course-builder:chapter')} onClose={() => setChapterDialog(null)} onSave={saveChapter} />
      ) : null}
      {videoDialog ? (
        <VideoContentModal chapter={videoDialog.chapter} video={videoDialog.video} initialMode={videoDialog.mode} busy={modalBusy} error={modalError} draftKey={draftKey(profile?.id, 'teacher:course-builder:video')} uploadProgress={videoUpload} onCancelUpload={videoUpload.cancelUpload} onClose={() => setVideoDialog(null)} onSave={saveVideo} />
      ) : null}
      {resourceDialog ? (
        <ResourceContentModal chapter={resourceDialog.chapter} attachment={resourceDialog.attachment} busy={modalBusy} error={modalError} draftKey={draftKey(profile?.id, 'teacher:course-builder:resource')} uploadProgress={resourceUpload} onCancelUpload={resourceUpload.cancelUpload} onClose={() => setResourceDialog(null)} onSave={saveResource} />
      ) : null}
      {deleteDialog ? (
        <ConfirmDeleteModal title={`Supprimer ${deleteDialog.kind === 'chapter' ? 'ce chapitre' : deleteDialog.kind === 'video' ? 'cette vidéo' : 'cette ressource'} ?`} message={`« ${deleteDialog.title} » sera supprimé définitivement${deleteDialog.kind === 'chapter' ? ' avec tout son contenu' : ''}.`} error={modalError} busy={modalBusy} onClose={() => setDeleteDialog(null)} onConfirm={() => { void confirmDelete(); }} />
      ) : null}
    </section>
  );
}

function BuilderHeader({ course }: { course: CourseWithContent }) {
  return (
    <header className="space-y-4">
      <BackButton label="Retour à mes cours" fallbackTo="/teacher/courses" />
      <div className="flex flex-col justify-between gap-5 rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Course Builder</p>
          <h1 className="mt-2 text-3xl font-black text-brand-navy">{course.title}</h1>
          <p className="mt-2 text-sm text-slate-600">Structurez votre cours en chapitres, vidéos, PDFs et pièces jointes.</p>
        </div>
        <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-bold text-brand-navy hover:bg-slate-50">
          <ExternalLink className="h-4 w-4" />Voir le cours public
        </Link>
      </div>
    </header>
  );
}

function BuilderSummary({ course, chapters, videos, files, lastSavedAt }: { course: CourseWithContent; chapters: number; videos: number; files: number; lastSavedAt: string | null }) {
  const checklist = [
    { done: Boolean(course.title && course.description), label: 'Informations générales remplies' },
    { done: chapters > 0, label: 'Au moins un chapitre' },
    { done: videos > 0, label: 'Au moins une vidéo' },
    { done: Boolean(course.cover_url), label: 'Image de couverture ajoutée' },
    { done: Number.isFinite(Number(course.price)), label: 'Tarification configurée' },
  ];
  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-brand-navy">Résumé du cours</h2>
        {course.cover_url ? <img src={course.cover_url} alt="" className="mt-4 aspect-video w-full rounded-xl object-cover" /> : <div className="mt-4 grid aspect-video place-items-center rounded-xl bg-slate-50 text-slate-400"><ImageIcon className="h-8 w-8" /></div>}
        <div className="mt-4 flex items-center justify-between"><span className="text-sm text-slate-500">Statut</span><StatusBadge published={course.is_published} /></div>
        <p className="mt-3 text-sm font-bold text-brand-navy">{course.subjects?.name ?? course.subject}</p>
        <div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Chapitres" value={chapters} /><Metric label="Vidéos" value={videos} /><Metric label="Fichiers" value={files} /></div>
        {lastSavedAt ? <p className="mt-4 text-xs text-slate-500">Dernier brouillon enregistré à {new Intl.DateTimeFormat('fr-TN', { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSavedAt))}</p> : null}
      </section>
      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-brand-navy">Checklist publication</h2>
        <div className="mt-4 space-y-3">
          {checklist.map((item) => <p key={item.label} className={`flex items-center gap-2 text-sm font-semibold ${item.done ? 'text-emerald-700' : 'text-slate-500'}`}><CircleCheck className={`h-4 w-4 ${item.done ? 'text-emerald-600' : 'text-slate-300'}`} />{item.label}</p>)}
        </div>
        <div className="mt-5 space-y-2">
          <Link to={`/courses/${course.id}`} className="flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />Voir le cours public</Link>
          <Link to={`/teacher/courses/${course.id}/edit`} className="flex items-center justify-center gap-2 rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy"><Settings2 className="h-4 w-4" />Paramètres du cours</Link>
        </div>
      </section>
    </aside>
  );
}

function BuilderEmptyState({ focusInput }: { focusInput: () => void }) {
  return (
    <section className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-brand-orange"><BookOpen className="h-6 w-6" /></span>
      <h2 className="mt-4 text-lg font-black text-brand-navy">Aucun chapitre pour le moment</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Commencez par ajouter votre premier chapitre pour organiser le contenu du cours.</p>
      <button type="button" onClick={focusInput} className="mt-5 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white">Créer le premier chapitre</button>
    </section>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{published ? 'Publié' : 'Brouillon'}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 px-2 py-3 text-center"><p className="text-lg font-black text-brand-navy">{value}</p><p className="text-[11px] font-semibold text-slate-500">{label}</p></div>;
}
