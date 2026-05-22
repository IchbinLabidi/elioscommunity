import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';

const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
const allowedAttachmentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ...allowedImageTypes,
];
const allowedPaymentProofTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const maxImageSize = 5 * 1024 * 1024;
const maxVideoSize = 300 * 1024 * 1024;
const maxPdfSize = 50 * 1024 * 1024;
const maxPaymentProofSize = 10 * 1024 * 1024;

function safeFileName(file: File) {
  return file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
}

export function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) return 'Image must be JPG, PNG, or WebP.';
  if (file.size > maxImageSize) return 'Image must be less than 5MB.';
  return '';
}

export function validateVideoFile(file: File) {
  if (!allowedVideoTypes.includes(file.type)) return 'Video must be MP4, WebM, or MOV.';
  if (file.size > maxVideoSize) return 'Video must be less than 300MB.';
  return '';
}

export function validatePdfFile(file: File) {
  if (file.type !== 'application/pdf') return 'Document must be a PDF.';
  if (file.size > maxPdfSize) return 'PDF must be less than 50MB.';
  return '';
}

export function validateAttachmentFile(file: File) {
  if (!allowedAttachmentTypes.includes(file.type)) return 'File must be PDF, Office document, spreadsheet, presentation, or image.';
  if (file.size > maxPdfSize) return 'File must be less than 50MB.';
  return '';
}

export function validatePaymentProofFile(file: File) {
  if (!allowedPaymentProofTypes.includes(file.type)) return 'Proof must be an image or PDF.';
  if (file.size > maxPaymentProofSize) return 'Proof must be less than 10MB.';
  return '';
}

async function uploadFile(bucket: string, path: string, file: File, action: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    logSupabaseError(action, error);
    throw error;
  }

  return {
    path,
    publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  };
}

async function uploadImage(bucket: string, path: string, file: File, action: string) {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  return (await uploadFile(bucket, path, file, action)).publicUrl;
}

export function uploadAvatar(file: File, userId: string) {
  const path = `${userId}/${Date.now()}-${safeFileName(file)}.webp`;
  return uploadImage('avatars', path, file, 'avatar.upload');
}

export function uploadCourseCover(file: File, teacherId: string, courseId: string) {
  const path = `${teacherId}/${courseId}/${Date.now()}-${safeFileName(file)}.webp`;
  return uploadImage('course-covers', path, file, 'course.cover.upload');
}

export async function uploadCourseVideo(file: File, teacherId: string, courseId: string, lessonId: string) {
  const validationError = validateVideoFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const path = `${teacherId}/${courseId}/${lessonId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('course-videos', path, file, 'course.video.upload');
}

export async function uploadCoursePdf(file: File, teacherId: string, courseId: string, lessonId: string) {
  const validationError = validatePdfFile(file);
  if (validationError) throw new Error(validationError);
  const path = `${teacherId}/${courseId}/${lessonId}/${Date.now()}-${safeFileName(file)}.pdf`;
  return uploadFile('course-pdfs', path, file, 'course.pdf.upload');
}

export async function uploadVideo(file: File, teacherId: string, courseId: string, chapterId: string) {
  const validationError = validateVideoFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const path = `${teacherId}/${courseId}/${chapterId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('chapter-videos', path, file, 'chapter.video.upload');
}

export async function uploadAttachment(file: File, teacherId: string, courseId: string, chapterId: string) {
  const validationError = validateAttachmentFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
  const path = `${teacherId}/${courseId}/${chapterId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('chapter-attachments', path, file, 'chapter.attachment.upload');
}

export async function uploadPaymentProof(file: File, studentId: string, courseId: string) {
  const validationError = validatePaymentProofFile(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
  const path = `${studentId}/${courseId}/${Date.now()}-${safeFileName(file)}.${extension}`;
  return uploadFile('payment-proofs', path, file, 'payment.proof.upload');
}
