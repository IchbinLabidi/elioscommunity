import { ArrowLeft, BookOpen, CheckCircle2, CreditCard, Globe, Image as ImageIcon, Info, Save, Send, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CourseCoverUpload from '../components/CourseCoverUpload';
import DraftRestoreBanner from '../components/forms/DraftRestoreBanner';
import DraftStatus from '../components/forms/DraftStatus';
import ActionDialog from '../components/ui/ActionDialog';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import useUploadWithProgress from '../hooks/useUploadWithProgress';
import { levels } from '../lib/constants';
import { createCourse, deleteCourse, getCourseById, updateCourse, uploadCourseCover } from '../services/coursesService';
import { getPublishedSubjects } from '../services/subjectsService';
import { validateImageFile } from '../services/uploadService';
import { Subject } from '../types/database';

function validUrl(value: string) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const inputClass = 'mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-orange-50';
const textareaClass = 'mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-orange-50';
const initialCourseForm = {
  title: '',
  description: '',
  price: '0',
  currency: 'TND',
  subject: '',
  subject_id: '',
  level: levels[0],
  duration: '',
  format: 'recorded' as 'online' | 'onsite' | 'hybrid' | 'recorded',
  course_link: '',
  contact_whatsapp: '',
  payment_instructions: '',
  payment_method: '',
  payment_phone: '',
  payment_bank_account: '',
  is_published: true,
};

export default function CourseFormPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialCourseForm);
  const [cover, setCover] = useState<File | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [ownerTeacherId, setOwnerTeacherId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const coverUpload = useUploadWithProgress();
  const draftRestoredRef = useRef(false);
  const coverPreview = useMemo(() => cover ? URL.createObjectURL(cover) : existingCover, [cover, existingCover]);
  const paid = Number(form.price) > 0;
  const selectedSubject = subjects.find((subject) => subject.id === form.subject_id);
  const priceLabel = paid ? `${Number(form.price).toLocaleString('fr-TN', { maximumFractionDigits: 3 })} ${form.currency || 'TND'}` : 'Gratuit';
  const courseDraft = useFormDraft({
    key: draftKey(profile?.id, id ? `teacher:edit-course:${id}` : 'teacher:create-course'),
    values: form,
    onRestore: (values) => {
      draftRestoredRef.current = true;
      setForm(values);
    },
  });

  useEffect(() => {
    if (!cover || !coverPreview) return undefined;
    return () => URL.revokeObjectURL(coverPreview);
  }, [cover, coverPreview]);

  useEffect(() => {
    getPublishedSubjects().then((items) => {
      setSubjects(items);
      setForm((current) => current.subject_id ? current : {
        ...current,
        subject_id: items[0]?.id ?? '',
        subject: items[0]?.name ?? '',
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    getCourseById(id).then((course) => {
      if (profile && course.teacher_id !== profile.id && profile.role !== 'admin') {
        setError('Vous ne pouvez modifier que vos propres cours.');
        return;
      }
      setOwnerTeacherId(course.teacher_id);
      const loadedForm = {
        title: course.title,
        description: course.description,
        price: String(course.price),
        currency: course.currency ?? 'TND',
        subject: course.subject,
        subject_id: course.subject_id ?? '',
        level: course.level,
        duration: course.duration ?? '',
        format: course.format ?? 'online',
        course_link: course.course_link ?? '',
        contact_whatsapp: course.contact_whatsapp ?? '',
        payment_instructions: course.payment_instructions ?? '',
        payment_method: course.payment_method ?? '',
        payment_phone: course.payment_phone ?? '',
        payment_bank_account: course.payment_bank_account ?? '',
        is_published: course.is_published,
      };
      if (!draftRestoredRef.current) setForm(loadedForm);
      setExistingCover(course.cover_url);
    }).catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger le cours.'));
  }, [id, profile]);

  const setField = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const saveCourse = async (publishedOverride?: boolean) => {
    if (!profile) return;
    if (form.title.trim().length < 5) return setError('Le titre doit contenir au moins 5 caractères.');
    if (form.description.trim().length < 20) return setError('La description doit contenir au moins 20 caractères.');
    if (!form.subject_id || !form.level) return setError('La matière et le niveau sont obligatoires.');
    if (Number(form.price) < 0) return setError('Le prix doit être supérieur ou égal à zéro.');
    if (!validUrl(form.course_link)) return setError('Le lien du cours doit être une URL valide.');
    if (cover) {
      const validation = validateImageFile(cover);
      if (validation) return setError(validation);
    }

    const isPublished = publishedOverride ?? form.is_published;
    setSaving(true);
    setError('');
    if (publishedOverride !== undefined) setField('is_published', isPublished);
    try {
      const payload = {
        teacher_id: id ? ownerTeacherId ?? profile.id : profile.id,
        subject_id: form.subject_id,
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        currency: form.currency.trim() || 'TND',
        subject: selectedSubject?.name ?? form.subject,
        level: form.level,
        duration: form.duration.trim() || null,
        format: form.format,
        course_link: form.course_link.trim() || null,
        contact_whatsapp: form.contact_whatsapp.trim() || null,
        payment_instructions: form.payment_instructions.trim() || null,
        payment_method: form.payment_method.trim() || null,
        payment_phone: form.payment_phone.trim() || null,
        payment_bank_account: form.payment_bank_account.trim() || null,
        is_published: isPublished,
        cover_url: existingCover,
      };
      if (id) {
        const coverUrl = cover ? await coverUpload.uploadFile((options) => uploadCourseCover(cover, ownerTeacherId ?? profile.id, id, options)) : existingCover;
        await updateCourse(id, { ...payload, cover_url: coverUrl });
        courseDraft.clearDraft();
        navigate('/teacher/courses');
      } else {
        const created = await createCourse({ ...payload, cover_url: null });
        if (cover) {
          const coverUrl = await coverUpload.uploadFile((options) => uploadCourseCover(cover, profile.id, created.id, options));
          await updateCourse(created.id, { cover_url: coverUrl });
        }
        courseDraft.clearDraft();
        navigate(`/teacher/courses/${created.id}/builder`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer le cours.');
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void saveCourse();
  };

  const remove = async () => {
    if (!id) return;
    await deleteCourse(id);
    navigate('/teacher/courses');
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-[1240px] space-y-6 pb-24">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/teacher/courses" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-brand-navy">
            <ArrowLeft className="h-4 w-4" />Retour à mes cours
          </Link>
          <p className="mt-6 text-xs font-black uppercase text-brand-orange">Gestion des cours</p>
          <h1 className="mt-2 text-3xl font-black text-brand-navy">{id ? 'Modifier le cours' : 'Créer un cours'}</h1>
          <p className="mt-2 text-sm text-slate-600">Renseignez les informations principales de votre cours avant publication.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ActionButton icon={Save} label="Enregistrer comme brouillon" disabled={saving} tone="secondary" onClick={() => void saveCourse(false)} />
          <ActionButton icon={Send} label={id ? 'Publier le cours' : 'Créer le cours'} disabled={saving} tone="primary" onClick={() => void saveCourse(true)} />
        </div>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {courseDraft.restored ? <DraftRestoreBanner fileReminder="L’image de couverture doit être sélectionnée à nouveau." onKeep={courseDraft.dismissRestoreBanner} onDiscard={courseDraft.discardDraft} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-5">
          <FormCard title="Informations générales" subtitle="Définissez le contenu, le public et le format de votre cours." icon={BookOpen}>
            <div className="space-y-5">
              <Field label="Titre du cours" required helper="Un titre précis aide les étudiants à trouver votre offre.">
                <input id="course-title" required value={form.title} placeholder="Ex. Algorithmique et sous-programmes" onChange={(event) => setField('title', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Description" required helper="Présentez brièvement le contenu et les objectifs du cours.">
                <textarea id="course-description" required value={form.description} placeholder="Décrivez les acquis, le programme et le public visé..." onChange={(event) => setField('description', event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Matière" required>
                  <select id="course-subject" required value={form.subject_id} onChange={(event) => {
                    const subject = subjects.find((item) => item.id === event.target.value);
                    setForm((current) => ({ ...current, subject_id: event.target.value, subject: subject?.name ?? '' }));
                  }} className={inputClass}>
                    <option value="">Sélectionner une matière</option>
                    {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </Field>
                <Field label="Niveau" required>
                  <select id="course-level" value={form.level} onChange={(event) => setField('level', event.target.value)} className={inputClass}>
                    {levels.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Format" required>
                  <select id="course-format" value={form.format} onChange={(event) => setField('format', event.target.value)} className={inputClass}>
                    <option value="recorded">Enregistré</option>
                    <option value="online">Live en ligne</option>
                    <option value="hybrid">Hybride</option>
                    <option value="onsite">Présentiel</option>
                  </select>
                </Field>
                <Field label="Durée" helper="Exemple : 8 heures, 12 semaines, 20 leçons.">
                  <input id="course-duration" value={form.duration} placeholder="Ex. 8 heures" onChange={(event) => setField('duration', event.target.value)} className={inputClass} />
                </Field>
              </div>
            </div>
          </FormCard>

          <FormCard title="Tarification" subtitle="Choisissez le prix et l’état de publication de votre cours." icon={CreditCard}>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_132px]">
              <Field label="Prix" required>
                <input id="course-price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField('price', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Devise" required>
                <input id="course-currency" value={form.currency} onChange={(event) => setField('currency', event.target.value)} className={inputClass} />
              </Field>
            </div>
            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-brand-navy">Statut tarifaire</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${paid ? 'bg-orange-50 text-brand-orange' : 'bg-emerald-50 text-emerald-700'}`}>{paid ? 'Cours payant' : 'Cours gratuit'}</span>
              </div>
              <label className="flex items-center gap-3 text-sm font-bold text-brand-navy">
                <span>{form.is_published ? 'Publié' : 'Brouillon'}</span>
                <button type="button" role="switch" aria-checked={form.is_published} onClick={() => setField('is_published', !form.is_published)} className={`relative h-7 w-12 rounded-full transition ${form.is_published ? 'bg-brand-orange' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.is_published ? 'left-6' : 'left-1'}`} />
                </button>
              </label>
            </div>
          </FormCard>

          <FormCard title="Contact & accès" subtitle={form.format === 'recorded' ? 'Ajoutez les accès et points de contact utiles pour votre contenu enregistré.' : 'Ajoutez les informations complémentaires d’accès et de contact.'} icon={Globe}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lien du cours" helper="Ajoutez un lien externe si nécessaire.">
                <input id="course-link" type="url" value={form.course_link} placeholder="https://" onChange={(event) => setField('course_link', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Numéro WhatsApp" helper="Optionnel. Visible pour faciliter le contact.">
                <input id="course-whatsapp" value={form.contact_whatsapp} placeholder="+216 XX XXX XXX" onChange={(event) => setField('contact_whatsapp', event.target.value)} className={inputClass} />
              </Field>
            </div>
          </FormCard>

          {paid ? (
            <FormCard title="Détails de paiement" subtitle="Ces informations seront visibles par les étudiants lors du paiement." icon={CreditCard} accent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Méthode de paiement">
                  <input id="payment-method" value={form.payment_method} placeholder="Ex. D17, virement bancaire" onChange={(event) => setField('payment_method', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Numéro de paiement">
                  <input id="payment-phone" value={form.payment_phone} placeholder="+216 XX XXX XXX" onChange={(event) => setField('payment_phone', event.target.value)} className={inputClass} />
                </Field>
              </div>
              <div className="mt-4 space-y-4">
                <Field label="Compte bancaire">
                  <input id="payment-bank" value={form.payment_bank_account} placeholder="RIB ou informations de virement" onChange={(event) => setField('payment_bank_account', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Instructions de paiement">
                  <textarea id="payment-instructions" value={form.payment_instructions} placeholder="Expliquez les étapes de paiement et la preuve à transmettre." onChange={(event) => setField('payment_instructions', event.target.value)} rows={3} className={textareaClass} />
                </Field>
              </div>
            </FormCard>
          ) : null}

          <FormCard title="Média du cours" subtitle="Une couverture claire rend votre cours plus identifiable dans le catalogue." icon={ImageIcon}>
            <CourseCoverUpload file={cover} previewUrl={coverPreview} onChange={(file) => { setCover(file); coverUpload.resetUpload(); }} progress={coverUpload} onCancel={coverUpload.cancelUpload} />
          </FormCard>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <CourseSummary form={form} priceLabel={priceLabel} subjectName={selectedSubject?.name ?? form.subject} coverPreview={coverPreview} />
          <div className="rounded-xl border border-brand-border bg-white px-4 py-3 shadow-sm">
            <DraftStatus status={courseDraft.status} lastSavedAt={courseDraft.lastSavedAt} />
          </div>
          {id ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50">
              <Trash2 className="h-4 w-4" />Supprimer le cours
            </button>
          ) : null}
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1240px] flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/teacher/courses" className="inline-flex justify-center rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Retour</Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ActionButton icon={Save} label="Enregistrer brouillon" disabled={saving} tone="secondary" onClick={() => void saveCourse(false)} />
            <ActionButton icon={Send} label={saving ? 'Enregistrement...' : id ? 'Publier le cours' : 'Créer le cours'} disabled={saving} tone="primary" onClick={() => void saveCourse(true)} />
          </div>
        </div>
      </footer>
      <ActionDialog open={confirmDelete} title="Supprimer ce cours ?" message="Cette action retirera définitivement le cours et son contenu associé." confirmLabel="Supprimer le cours" danger busy={saving} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
    </form>
  );
}

function FormCard({ title, subtitle, icon: Icon, accent = false, children }: { title: string; subtitle: string; icon: typeof BookOpen; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${accent ? 'border-orange-100' : 'border-brand-border'}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent ? 'bg-orange-50 text-brand-orange' : 'bg-slate-50 text-brand-navy'}`}><Icon className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-black text-brand-navy">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, helper, required = false, children }: { label: string; helper?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-brand-navy">
      {label}{required ? <span className="ml-1 text-brand-orange">*</span> : null}
      {children}
      {helper ? <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function CourseSummary({ form, priceLabel, subjectName, coverPreview }: { form: { title: string; description: string; subject_id: string; level: string; format: string; price: string; is_published: boolean }; priceLabel: string; subjectName: string; coverPreview: string | null }) {
  const complete = [
    { label: 'Titre rempli', done: form.title.trim().length >= 5 },
    { label: 'Description ajoutée', done: form.description.trim().length >= 20 },
    { label: 'Image ajoutée', done: Boolean(coverPreview) },
    { label: 'Tarification définie', done: form.price !== '' && Number(form.price) >= 0 },
  ];
  const formatLabels: Record<string, string> = { online: 'Live en ligne', onsite: 'Présentiel', hybrid: 'Hybride', recorded: 'Enregistré' };
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="aspect-video bg-slate-50">
        {coverPreview ? <img src={coverPreview} alt="Aperçu de la couverture du cours" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-center text-slate-400"><div><ImageIcon className="mx-auto h-8 w-8" /><p className="mt-2 text-xs font-semibold">Aperçu de la couverture</p></div></div>}
      </div>
      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-brand-navy">Aperçu</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${form.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{form.is_published ? 'Publié' : 'Brouillon'}</span>
        </div>
        <p className="line-clamp-2 font-bold text-brand-navy">{form.title.trim() || 'Titre de votre cours'}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <SummaryValue label="Prix" value={priceLabel} />
          <SummaryValue label="Matière" value={subjectName || 'Non choisie'} />
          <SummaryValue label="Niveau" value={form.level || 'Non choisi'} />
          <SummaryValue label="Format" value={formatLabels[form.format] ?? form.format} />
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-black uppercase text-slate-500">Prêt à publier</p>
          <div className="space-y-2.5">
            {complete.map((item) => (
              <p key={item.label} className={`flex items-center gap-2 text-sm font-semibold ${item.done ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="h-4 w-4" />{item.label}
              </p>
            ))}
          </div>
        </div>
        <p className="flex gap-2 rounded-xl bg-orange-50 p-3 text-xs leading-5 text-slate-600"><Info className="h-4 w-4 shrink-0 text-brand-orange" />Vous pourrez compléter le contenu et les leçons après la création.</p>
      </div>
    </section>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 truncate font-bold text-brand-navy">{value}</p></div>;
}

function ActionButton({ icon: Icon, label, disabled, tone, onClick }: { icon: typeof Save; label: string; disabled: boolean; tone: 'primary' | 'secondary'; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition disabled:opacity-60 ${tone === 'primary' ? 'bg-brand-orange text-white shadow-sm hover:bg-orange-600' : 'border border-brand-border bg-white text-brand-navy hover:bg-slate-50'}`}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}
