import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImageCropModal from '../components/ImageCropModal';
import DraftRestoreBanner from '../components/forms/DraftRestoreBanner';
import DraftStatus from '../components/forms/DraftStatus';
import UploadProgressBar from '../components/upload/UploadProgressBar';
import BackButton from '../components/navigation/BackButton';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import useUploadWithProgress from '../hooks/useUploadWithProgress';
import { getErrorMessage } from '../lib/debug';
import { createQuestion, uploadQuestionImage, validateQuestionImage } from '../lib/questionsService';
import { getPublishedSubjects } from '../services/subjectsService';
import { Subject } from '../types/database';

export default function CreateQuestionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState('');
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const imageUpload = useUploadWithProgress();
  const selectedSubject = subjects.find((item) => item.id === subjectId);
  const questionDraft = useFormDraft({
    key: draftKey(profile?.id, 'student:ask-question'),
    values: { title, description, subjectId },
    onRestore: (values) => {
      setTitle(values.title);
      setDescription(values.description);
      setSubjectId(values.subjectId);
    },
    expiresInMs: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    getPublishedSubjects().then((items) => {
      setSubjects(items);
      setSubjectId((current) => current || items[0]?.id || '');
    }).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    return () => {
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
      if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    };
  }, [originalImageUrl, croppedPreviewUrl]);

  const validate = () => {
    if (profile?.role !== 'student') return 'Only students can ask questions.';
    if (title.trim().length < 10) return 'Title must be at least 10 characters.';
    if (description.trim().length < 20) return 'Description must be at least 20 characters.';
    if (!selectedSubject) return 'Choisissez une matière.';
    if (croppedImageFile) return validateQuestionImage(croppedImageFile);
    return '';
  };

  const clearFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearOriginalImage = () => {
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    setOriginalImageUrl('');
    setIsCropModalOpen(false);
    clearFileInput();
  };

  const removeCroppedImage = () => {
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    setCroppedImageFile(null);
    setCroppedPreviewUrl('');
    setOriginalImageUrl('');
    setIsCropModalOpen(false);
    imageUpload.resetUpload();
    clearFileInput();
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    imageUpload.resetUpload();
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateQuestionImage(file);
    if (validationError) {
      setError(validationError);
      clearFileInput();
      return;
    }

    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    const previewUrl = URL.createObjectURL(file);
    setOriginalImageUrl(previewUrl);
    setIsCropModalOpen(true);
  };

  const handleCropComplete = (file: File, previewUrl: string) => {
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    setCroppedImageFile(file);
    setCroppedPreviewUrl(previewUrl);
    setOriginalImageUrl('');
    setIsCropModalOpen(false);
    clearFileInput();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const imageUrl = croppedImageFile ? await imageUpload.uploadFile((options) => uploadQuestionImage(croppedImageFile, profile.id, options)) : null;
      const question = await createQuestion({
        studentId: profile.id,
        title: title.trim(),
        description: description.trim(),
        subject: selectedSubject?.name ?? '',
        subjectId: selectedSubject?.id.startsWith('fallback-') ? null : selectedSubject?.id,
        imageUrl,
      });
      questionDraft.clearDraft();
      setSuccess('Question published.');
      navigate(`/questions/${question.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create question.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <BackButton label="Back to questions" fallbackTo="/questions" />
      <div>
      <h1 className="text-3xl font-bold text-elios-navy">Ask a question</h1>
      <p className="mt-2 text-slate-600">Share your question with enough detail for a teacher to help.</p>
      </div>
      {questionDraft.restored ? <DraftRestoreBanner fileReminder="Veuillez sélectionner à nouveau l’image si nécessaire." onKeep={questionDraft.dismissRestoreBanner} onDiscard={questionDraft.discardDraft} /> : null}
      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}
        <label className="block text-sm font-semibold text-elios-navy">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={10} placeholder="Example: How do I solve this quadratic equation?" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" required />
        </label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={7} minLength={20} placeholder="Explain what you tried, where you got stuck, and any context your teacher needs." className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" required />
        </label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">
          Matière
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky">
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="mt-4">
          <p className="text-sm font-semibold text-elios-navy">Optional image</p>
          <p className="mt-1 text-sm text-slate-500">Upload an image to explain your question better.</p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />

          {croppedPreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img src={croppedPreviewUrl} alt="Cropped question attachment preview" className="aspect-video w-full object-cover" />
              <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 font-bold text-elios-navy hover:bg-slate-50">
                  <RefreshCcw size={18} />
                  Change image
                </button>
                <button type="button" onClick={removeCroppedImage} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-3 font-bold text-red-700 hover:bg-red-50">
                  <Trash2 size={18} />
                  Remove image
                </button>
              </div>
              <div className="px-4 pb-4"><UploadProgressBar state={imageUpload} /></div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-elios-yellow hover:bg-yellow-50">
              <ImagePlus className="text-elios-blue" size={30} />
              <span className="mt-2 font-bold text-elios-navy">Choose image</span>
              <span className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP. Maximum 5MB.</span>
            </button>
          )}
        </div>
        <button disabled={loading} className="mt-6 rounded-lg bg-elios-navy px-5 py-3 font-bold text-white disabled:opacity-60">
          {loading ? 'Publishing...' : 'Publish question'}
        </button>
        <div className="mt-4"><DraftStatus status={questionDraft.status} lastSavedAt={questionDraft.lastSavedAt} /></div>
      </form>
      <ImageCropModal
        imageSrc={originalImageUrl}
        isOpen={isCropModalOpen}
        onCancel={clearOriginalImage}
        onCropComplete={handleCropComplete}
      />
    </section>
  );
}
