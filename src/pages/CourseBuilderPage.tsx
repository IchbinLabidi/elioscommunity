import { FilePlus, Pencil, Plus, Trash2, Video } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublishBadge from '../components/PublishBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getCourseById } from '../services/coursesService';
import {
  createAttachment,
  createChapter,
  createVideo,
  deleteAttachment,
  deleteChapter,
  deleteVideo,
  getCourseContentForBuilder,
  updateAttachment,
  updateChapter,
  updateVideo,
} from '../services/courseContentService';
import { uploadAttachment, uploadVideo, validateAttachmentFile, validateVideoFile } from '../services/uploadService';
import { CourseChapterWithContent, CourseWithContent } from '../types/database';

function validUrl(value: string) {
  if (!value) return true;
  try { new URL(value); return true; } catch { return false; }
}

export default function CourseBuilderPage() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState<CourseWithContent | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    getCourseById(courseId)
      .then(async (courseData) => {
        if (profile?.role === 'teacher' && courseData.teacher_id !== profile.id) throw new Error('You can only manage your own courses.');
        setCourse(await getCourseContentForBuilder(courseData));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load course builder.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId, profile]);

  const nextChapterOrder = useMemo(() => Math.max(0, ...(course?.chapters.map((item) => item.chapter_order) ?? [])) + 1, [course]);

  const addChapter = async (event: FormEvent) => {
    event.preventDefault();
    if (!course || chapterTitle.trim().length < 3) return setError('Chapter title must be at least 3 characters.');
    setSaving(true);
    try {
      await createChapter(course, { title: chapterTitle.trim(), description: null, chapter_order: nextChapterOrder, is_free_preview: false, is_published: true });
      setChapterTitle('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add chapter.');
    } finally {
      setSaving(false);
    }
  };

  const editChapter = async (chapter: CourseChapterWithContent) => {
    const title = window.prompt('Chapter title', chapter.title);
    if (!title || title.trim().length < 3) return;
    await updateChapter(chapter.id, { title: title.trim() });
    load();
  };

  const togglePreview = async (chapter: CourseChapterWithContent) => {
    await updateChapter(chapter.id, { is_free_preview: !chapter.is_free_preview });
    load();
  };

  const toggleChapter = async (chapter: CourseChapterWithContent) => {
    await updateChapter(chapter.id, { is_published: !chapter.is_published });
    load();
  };

  const removeChapter = async (chapter: CourseChapterWithContent) => {
    if (!window.confirm('Delete this chapter and all content?')) return;
    await deleteChapter(chapter.id);
    load();
  };

  const addVideo = async (chapter: CourseChapterWithContent) => {
    const title = window.prompt('Video title');
    if (!title) return;
    const externalUrl = window.prompt('External video URL, or leave empty to upload a file') ?? '';
    if (externalUrl && !validUrl(externalUrl)) return setError('Video URL must be valid.');
    const order = Math.max(0, ...chapter.videos.map((item) => item.video_order)) + 1;
    await createVideo(chapter, { title: title.trim(), description: null, video_order: order, video_url: externalUrl.trim() || null, video_path: null, duration_seconds: null, is_published: true });
    load();
  };

  const uploadVideoFile = async (chapter: CourseChapterWithContent, file: File | null) => {
    if (!file || !course) return;
    const validation = validateVideoFile(file);
    if (validation) return setError(validation);
    const uploaded = await uploadVideo(file, course.teacher_id, course.id, chapter.id);
    const order = Math.max(0, ...chapter.videos.map((item) => item.video_order)) + 1;
    await createVideo(chapter, { title: file.name.replace(/\.[^/.]+$/, ''), description: null, video_order: order, video_url: uploaded.publicUrl, video_path: uploaded.path, duration_seconds: null, is_published: true });
    load();
  };

  const uploadAttachmentFile = async (chapter: CourseChapterWithContent, file: File | null) => {
    if (!file || !course) return;
    const validation = validateAttachmentFile(file);
    if (validation) return setError(validation);
    const uploaded = await uploadAttachment(file, course.teacher_id, course.id, chapter.id);
    const order = Math.max(0, ...chapter.attachments.map((item) => item.attachment_order)) + 1;
    await createAttachment(chapter, { title: file.name.replace(/\.[^/.]+$/, ''), file_url: uploaded.publicUrl, file_path: uploaded.path, file_type: file.type, file_size: file.size, attachment_order: order, is_published: true });
    load();
  };

  const editVideo = async (videoId: string, currentTitle: string, currentUrl: string | null) => {
    const title = window.prompt('Video title', currentTitle);
    if (!title || title.trim().length < 1) return;
    const url = window.prompt('Video URL', currentUrl ?? '') ?? '';
    if (url && !validUrl(url)) return setError('Video URL must be valid.');
    await updateVideo(videoId, { title: title.trim(), video_url: url.trim() || currentUrl });
    load();
  };

  const removeVideo = async (videoId: string) => {
    if (!window.confirm('Delete this video?')) return;
    await deleteVideo(videoId);
    load();
  };

  const editAttachment = async (attachmentId: string, currentTitle: string) => {
    const title = window.prompt('File title', currentTitle);
    if (!title || title.trim().length < 1) return;
    await updateAttachment(attachmentId, { title: title.trim() });
    load();
  };

  const removeAttachment = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    await deleteAttachment(attachmentId);
    load();
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || 'Course not found.'}</p>;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-elios-blue">Course builder</p>
          <h1 className="mt-1 text-3xl font-bold text-elios-navy">{course.title}</h1>
          <p className="mt-2 text-slate-600">Build chapters, videos, PDFs, and attachments directly inside this course.</p>
        </div>
        <Link to={`/courses/${course.id}`} className="rounded-lg border border-slate-200 px-4 py-3 text-center font-bold text-elios-blue">View public course</Link>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={addChapter} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} placeholder="New chapter title" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-3" />
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy"><Plus className="h-4 w-4" />Add chapter</button>
      </form>
      {course.chapters.length ? course.chapters.map((chapter) => (
        <article key={chapter.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-elios-blue">Chapter {chapter.chapter_order}</p>
              <h2 className="text-xl font-bold text-elios-navy">{chapter.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2"><PublishBadge published={chapter.is_published} />{chapter.is_free_preview ? <PublishBadge preview /> : null}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => addVideo(chapter)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue"><Video className="h-4 w-4" />Video URL</button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue"><Video className="h-4 w-4" />Upload video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => uploadVideoFile(chapter, event.target.files?.[0] ?? null)} className="hidden" /></label>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue"><FilePlus className="h-4 w-4" />Add PDF/file<input type="file" onChange={(event) => uploadAttachmentFile(chapter, event.target.files?.[0] ?? null)} className="hidden" /></label>
              <button onClick={() => togglePreview(chapter)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue">Preview</button>
              <button onClick={() => toggleChapter(chapter)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue">{chapter.is_published ? 'Draft' : 'Publish'}</button>
              <button onClick={() => editChapter(chapter)} className="rounded-lg border border-slate-200 p-2 text-elios-blue"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => removeChapter(chapter)} className="rounded-lg border border-slate-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-bold text-elios-navy">Videos</p>{chapter.videos.length ? chapter.videos.map((video) => <p key={video.id} className="mt-2 flex justify-between gap-3 text-sm text-slate-600"><span className="min-w-0 truncate">{video.title}</span><span className="shrink-0 space-x-3"><button onClick={() => editVideo(video.id, video.title, video.video_url)} className="text-elios-blue">Edit</button><button onClick={() => removeVideo(video.id)} className="text-red-600">Delete</button></span></p>) : <p className="mt-2 text-sm text-slate-500">No videos yet.</p>}</div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-bold text-elios-navy">PDFs and attachments</p>{chapter.attachments.length ? chapter.attachments.map((file) => <p key={file.id} className="mt-2 flex justify-between gap-3 text-sm text-slate-600"><span className="min-w-0 truncate">{file.title}</span><span className="shrink-0 space-x-3"><button onClick={() => editAttachment(file.id, file.title)} className="text-elios-blue">Edit</button><button onClick={() => removeAttachment(file.id)} className="text-red-600">Delete</button></span></p>) : <p className="mt-2 text-sm text-slate-500">No attachments yet.</p>}</div>
          </div>
        </article>
      )) : <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No chapters yet. Add your first chapter to start building the course.</p>}
    </section>
  );
}
