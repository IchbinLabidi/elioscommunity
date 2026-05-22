import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CourseCoverUpload from '../components/CourseCoverUpload';
import { useAuth } from '../contexts/AuthContext';
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

export default function CourseFormPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
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
  });
  const [cover, setCover] = useState<File | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [ownerTeacherId, setOwnerTeacherId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const coverPreview = useMemo(() => cover ? URL.createObjectURL(cover) : existingCover, [cover, existingCover]);

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
        setError('You can only edit your own courses.');
        return;
      }
      setOwnerTeacherId(course.teacher_id);
      setForm({
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
      });
      setExistingCover(course.cover_url);
    }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load course.'));
  }, [id, profile]);

  const setField = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    if (form.title.trim().length < 5) return setError('Title must be at least 5 characters.');
    if (form.description.trim().length < 20) return setError('Description must be at least 20 characters.');
    if (!form.subject_id || !form.level) return setError('Subject and level are required.');
    if (Number(form.price) < 0) return setError('Price must be 0 or more.');
    if (!validUrl(form.course_link)) return setError('Course link must be a valid URL.');
    if (cover) {
      const validation = validateImageFile(cover);
      if (validation) return setError(validation);
    }

    setSaving(true);
    setError('');
    try {
      const selectedSubject = subjects.find((subject) => subject.id === form.subject_id);
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
        is_published: form.is_published,
        cover_url: existingCover,
      };
      if (id) {
        const coverUrl = cover ? await uploadCourseCover(cover, ownerTeacherId ?? profile.id, id) : existingCover;
        await updateCourse(id, { ...payload, cover_url: coverUrl });
        navigate('/teacher/courses');
      } else {
        const created = await createCourse({ ...payload, cover_url: null });
        if (cover) {
          const coverUrl = await uploadCourseCover(cover, profile.id, created.id);
          await updateCourse(created.id, { cover_url: coverUrl });
        }
        navigate(`/teacher/courses/${created.id}/builder`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save course.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !window.confirm('Delete this course?')) return;
    await deleteCourse(id);
    navigate('/teacher/courses');
  };

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-elios-navy">{id ? 'Edit course' : 'Create course'}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <label className="block text-sm font-semibold text-elios-navy">Title<input value={form.title} onChange={(event) => setField('title', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="block text-sm font-semibold text-elios-navy">Description<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-semibold text-elios-navy">Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField('price', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="block text-sm font-semibold text-elios-navy">Currency<input value={form.currency} onChange={(event) => setField('currency', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="block text-sm font-semibold text-elios-navy">Level<select value={form.level} onChange={(event) => setField('level', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3">{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="block text-sm font-semibold text-elios-navy">Subject
          <select
            value={form.subject_id}
            onChange={(event) => {
              const selectedSubject = subjects.find((subject) => subject.id === event.target.value);
              setForm((current) => ({ ...current, subject_id: event.target.value, subject: selectedSubject?.name ?? '' }));
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
          >
            <option value="">Select subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-elios-navy">Duration<input value={form.duration} onChange={(event) => setField('duration', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="block text-sm font-semibold text-elios-navy">Format<select value={form.format} onChange={(event) => setField('format', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3"><option value="online">Online</option><option value="onsite">Onsite</option><option value="hybrid">Hybrid</option><option value="recorded">Recorded</option></select></label>
        </div>
        <label className="block text-sm font-semibold text-elios-navy">Course link<input value={form.course_link} onChange={(event) => setField('course_link', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="block text-sm font-semibold text-elios-navy">Contact WhatsApp<input value={form.contact_whatsapp} onChange={(event) => setField('contact_whatsapp', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <div className="rounded-lg border border-elios-yellow bg-yellow-50 p-4">
          <h2 className="font-bold text-elios-navy">Payment details for paid courses</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-elios-navy">Payment method<input value={form.payment_method} onChange={(event) => setField('payment_method', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
            <label className="block text-sm font-semibold text-elios-navy">Payment phone<input value={form.payment_phone} onChange={(event) => setField('payment_phone', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-elios-navy">Bank account<input value={form.payment_bank_account} onChange={(event) => setField('payment_bank_account', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="mt-4 block text-sm font-semibold text-elios-navy">Payment instructions<textarea value={form.payment_instructions} onChange={(event) => setField('payment_instructions', event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        </div>
        <CourseCoverUpload previewUrl={coverPreview} onChange={setCover} />
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-elios-navy"><input type="checkbox" checked={form.is_published} onChange={(event) => setField('is_published', event.target.checked)} /> Published</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button disabled={saving} className="rounded-lg bg-elios-navy px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save course'}</button>
          {id ? <button type="button" onClick={remove} className="rounded-lg border border-red-100 px-5 py-3 font-bold text-red-700 hover:bg-red-50">Delete course</button> : null}
        </div>
      </form>
    </section>
  );
}
