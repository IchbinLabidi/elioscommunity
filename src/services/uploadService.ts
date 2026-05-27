import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { getCachedUploadSettings } from './platformSettingsService';

const bytesPerMb = 1024 * 1024;

export type UploadProgressOptions = {
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
};

function extension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'video/quicktime') return 'mov';
  return file.type.split('/').pop()?.toLowerCase() ?? '';
}

function accepts(file: File, allowed: string[]) {
  return allowed.map((type) => type.replace(/^\./, '').toLowerCase()).includes(extension(file));
}

function safeFileName(file: File) {
  return file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
}

export function validateImageFile(file: File) {
  const settings = getCachedUploadSettings();
  if (!accepts(file, settings.allowedImageTypes)) return `Image must be ${settings.allowedImageTypes.join(', ').toUpperCase()}.`;
  if (file.size > settings.maxImageSizeMB * bytesPerMb) return `Image must be less than ${settings.maxImageSizeMB}MB.`;
  return '';
}

export function validateVideoFile(file: File) {
  const settings = getCachedUploadSettings();
  if (!accepts(file, settings.allowedVideoTypes)) return `Video must be ${settings.allowedVideoTypes.join(', ').toUpperCase()}.`;
  if (file.size > settings.maxVideoSizeMB * bytesPerMb) return `Video must be less than ${settings.maxVideoSizeMB}MB.`;
  return '';
}

export function validatePdfFile(file: File) {
  if (file.type !== 'application/pdf') return 'Document must be a PDF.';
  const settings = getCachedUploadSettings();
  if (file.size > settings.maxAttachmentSizeMB * bytesPerMb) return `PDF must be less than ${settings.maxAttachmentSizeMB}MB.`;
  return '';
}

export function validateAttachmentFile(file: File) {
  const settings = getCachedUploadSettings();
  if (!accepts(file, settings.allowedAttachmentTypes)) return `Allowed file types: ${settings.allowedAttachmentTypes.join(', ').toUpperCase()}.`;
  if (file.size > settings.maxAttachmentSizeMB * bytesPerMb) return `File must be less than ${settings.maxAttachmentSizeMB}MB.`;
  return '';
}

export function validatePaymentProofFile(file: File) {
  const settings = getCachedUploadSettings();
  if (!accepts(file, settings.allowedPaymentProofTypes)) return `Allowed proof types: ${settings.allowedPaymentProofTypes.join(', ').toUpperCase()}.`;
  if (file.size > settings.maxPaymentProofSizeMB * bytesPerMb) return `Proof must be less than ${settings.maxPaymentProofSizeMB}MB.`;
  return '';
}

function uploadErrorMessage(status: number, responseText: string) {
  if (status === 401 || status === 403) return 'Vous n’etes pas autorise a televerser ce fichier.';
  if (status === 413) return 'Le fichier est trop volumineux.';
  try {
    const response = JSON.parse(responseText) as { message?: string; error?: string };
    return response.message || response.error || 'Le televersement a echoue.';
  } catch {
    return 'Le televersement a echoue. Reessayez.';
  }
}

async function uploadFile(bucket: string, path: string, file: File, action: string, options: UploadProgressOptions = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anonKey) throw new Error('Configuration de stockage indisponible.');
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? anonKey;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded, event.total);
    };
    xhr.onload = () => {
      options.signal?.removeEventListener('abort', abort);
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(file.size, file.size);
        resolve();
        return;
      }
      const uploadError = new Error(uploadErrorMessage(xhr.status, xhr.responseText));
      logSupabaseError(action, uploadError);
      reject(uploadError);
    };
    xhr.onerror = () => {
      options.signal?.removeEventListener('abort', abort);
      const uploadError = new Error('Probleme de connexion. Reessayez.');
      logSupabaseError(action, uploadError);
      reject(uploadError);
    };
    xhr.onabort = () => {
      options.signal?.removeEventListener('abort', abort);
      reject(new DOMException('Televersement annule', 'AbortError'));
    };
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('cache-control', '3600');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(file);
  });

  return { path, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

async function uploadImage(bucket: string, path: string, file: File, action: string, options?: UploadProgressOptions) {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  return (await uploadFile(bucket, path, file, action, options)).publicUrl;
}

export function uploadAvatar(file: File, userId: string, options?: UploadProgressOptions) {
  const path = `${userId}/${Date.now()}-${safeFileName(file)}.webp`;
  return uploadImage('avatars', path, file, 'avatar.upload', options);
}

export function uploadCourseCover(file: File, teacherId: string, courseId: string, options?: UploadProgressOptions) {
  const path = `${teacherId}/${courseId}/${Date.now()}-${safeFileName(file)}.webp`;
  return uploadImage('course-covers', path, file, 'course.cover.upload', options);
}

export async function uploadCourseVideo(file: File, teacherId: string, courseId: string, lessonId: string, options?: UploadProgressOptions) {
  const validationError = validateVideoFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const path = `${teacherId}/${courseId}/${lessonId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('course-videos', path, file, 'course.video.upload', options);
}

export async function uploadCoursePdf(file: File, teacherId: string, courseId: string, lessonId: string, options?: UploadProgressOptions) {
  const validationError = validatePdfFile(file);
  if (validationError) throw new Error(validationError);
  const path = `${teacherId}/${courseId}/${lessonId}/${Date.now()}-${safeFileName(file)}.pdf`;
  return uploadFile('course-pdfs', path, file, 'course.pdf.upload', options);
}

export async function uploadVideo(file: File, teacherId: string, courseId: string, chapterId: string, options?: UploadProgressOptions) {
  const validationError = validateVideoFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const path = `${teacherId}/${courseId}/${chapterId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('chapter-videos', path, file, 'chapter.video.upload', options);
}

export async function uploadAttachment(file: File, teacherId: string, courseId: string, chapterId: string, options?: UploadProgressOptions) {
  const validationError = validateAttachmentFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
  const path = `${teacherId}/${courseId}/${chapterId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('chapter-attachments', path, file, 'chapter.attachment.upload', options);
}

export async function uploadPaymentProof(file: File, studentId: string, courseId: string, options?: UploadProgressOptions) {
  const validationError = validatePaymentProofFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
  const path = `${studentId}/${courseId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('payment-proofs', path, file, 'payment.proof.upload', options);
}

export async function uploadQuestionImage(file: File, userId: string, options?: UploadProgressOptions) {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);
  const path = `questions/${userId}/${Date.now()}-${safeFileName(file)}.webp`;
  return (await uploadFile('question-images', path, file, 'question.image.upload', options)).publicUrl;
}
