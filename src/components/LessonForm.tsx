import { FormEvent, useEffect, useState } from 'react';
import FileUploadField from './FileUploadField';
import { CourseLesson } from '../types/database';
import { validatePdfFile, validateVideoFile } from '../services/uploadService';

function validUrl(value: string) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export type LessonFormValues = {
  title: string;
  description: string;
  lesson_order: number;
  video_url: string;
  is_free_preview: boolean;
  is_published: boolean;
  videoFile: File | null;
  pdfFile: File | null;
};

export default function LessonForm({
  lesson,
  nextOrder,
  saving,
  onCancel,
  onSubmit,
}: {
  lesson?: CourseLesson | null;
  nextOrder: number;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: LessonFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<LessonFormValues>({
    title: '',
    description: '',
    lesson_order: nextOrder,
    video_url: '',
    is_free_preview: false,
    is_published: true,
    videoFile: null,
    pdfFile: null,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      title: lesson?.title ?? '',
      description: lesson?.description ?? '',
      lesson_order: lesson?.lesson_order ?? nextOrder,
      video_url: lesson?.video_url && !lesson.video_path ? lesson.video_url : '',
      is_free_preview: lesson?.is_free_preview ?? false,
      is_published: lesson?.is_published ?? true,
      videoFile: null,
      pdfFile: null,
    });
    setError('');
  }, [lesson, nextOrder]);

  const setField = <K extends keyof LessonFormValues>(key: K, value: LessonFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.title.trim().length < 3) return setError('Lesson title is required.');
    if (form.lesson_order < 1) return setError('Lesson order must be at least 1.');
    if (!validUrl(form.video_url)) return setError('Video URL must be a valid URL.');
    if (!lesson && !form.video_url && !form.videoFile && !form.pdfFile) return setError('Add a video URL, video file, or PDF.');
    if (form.videoFile) {
      const validation = validateVideoFile(form.videoFile);
      if (validation) return setError(validation);
    }
    if (form.pdfFile) {
      const validation = validatePdfFile(form.pdfFile);
      if (validation) return setError(validation);
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-elios-navy">{lesson ? 'Edit lesson' : 'Add lesson'}</h2>
        <p className="mt-1 text-sm text-slate-600">Add a video, a PDF, or both.</p>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-[1fr_140px]">
        <label className="block text-sm font-semibold text-elios-navy">Lesson title<input value={form.title} onChange={(event) => setField('title', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="block text-sm font-semibold text-elios-navy">Order<input type="number" min="1" value={form.lesson_order} onChange={(event) => setField('lesson_order', Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
      </div>
      <label className="block text-sm font-semibold text-elios-navy">Description<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
      <label className="block text-sm font-semibold text-elios-navy">External video URL<input value={form.video_url} onChange={(event) => setField('video_url', event.target.value)} placeholder="https://youtube.com/..." className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <FileUploadField label="Upload video" helper="MP4, WebM, or MOV. Maximum 300MB." accept="video/mp4,video/webm,video/quicktime" file={form.videoFile} onChange={(file) => setField('videoFile', file)} />
        <FileUploadField label="Upload PDF" helper="PDF only. Maximum 50MB." accept="application/pdf" file={form.pdfFile} onChange={(file) => setField('pdfFile', file)} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-elios-navy">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_free_preview} onChange={(event) => setField('is_free_preview', event.target.checked)} /> Free preview</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_published} onChange={(event) => setField('is_published', event.target.checked)} /> Published</label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button disabled={saving} className="rounded-lg bg-elios-navy px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save lesson'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-elios-blue">Cancel</button>
      </div>
    </form>
  );
}
