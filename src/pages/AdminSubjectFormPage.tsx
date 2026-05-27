import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/navigation/BackButton';
import DraftRestoreBanner from '../components/forms/DraftRestoreBanner';
import DraftStatus from '../components/forms/DraftStatus';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import {
  checkSubjectCanDelete,
  createSubject,
  generateSubjectSlug,
  getAdminSubjectById,
  isSubjectSlugAvailable,
  manageSubject,
  SubjectPayload,
  updateSubject,
} from '../services/adminSubjectsService';

const initialForm: SubjectPayload = {
  name: '',
  slug: '',
  description: null,
  cover_url: null,
  icon: null,
  icon_url: null,
  color: '#FF8A00',
  subject_order: 0,
  is_published: true,
  is_featured: false,
};

export default function AdminSubjectFormPage() {
  const { subjectId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const editing = Boolean(subjectId);
  const [form, setForm] = useState<SubjectPayload>(initialForm);
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const draftRestoredRef = useRef(false);
  const subjectDraft = useFormDraft({
    key: draftKey(profile?.id, subjectId ? `admin:edit-subject:${subjectId}` : 'admin:create-subject'),
    values: form,
    onRestore: (values) => {
      draftRestoredRef.current = true;
      setForm(values);
      setDirty(true);
    },
    shouldSave: () => dirty,
  });

  useEffect(() => {
    if (!subjectId) return;
    getAdminSubjectById(subjectId)
      .then((subject) => {
        if (!subject) throw new Error('Cette matière est introuvable.');
        const loadedForm = {
          name: subject.name,
          slug: subject.slug,
          description: subject.description,
          cover_url: subject.cover_url,
          icon: subject.icon,
          icon_url: subject.icon_url ?? null,
          color: subject.color ?? '#FF8A00',
          subject_order: subject.subject_order,
          is_published: subject.is_published,
          is_featured: subject.is_featured ?? false,
        };
        if (!draftRestoredRef.current) setForm(loadedForm);
        setSlugEdited(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger la matière.'))
      .finally(() => setLoading(false));
  }, [subjectId]);

  const setField = <K extends keyof SubjectPayload>(key: K, value: SubjectPayload[K]) => { setDirty(true); setForm((current) => ({ ...current, [key]: value })); };
  const changeName = (name: string) => { setDirty(true); setForm((current) => ({ ...current, name, slug: slugEdited ? current.slug : generateSubjectSlug(name) })); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const name = form.name.trim();
    const slug = generateSubjectSlug(form.slug);
    if (!name) return setError('Le nom de la matière est requis.');
    if (!slug) return setError('Le slug est requis.');
    if (form.color && !/^#[0-9a-f]{6}$/i.test(form.color)) return setError('La couleur doit être au format #RRGGBB.');
    setSaving(true);
    try {
      if (!(await isSubjectSlugAvailable(slug, subjectId))) {
        setError('Ce slug est déjà utilisé par une autre matière.');
        return;
      }
      const payload = {
        ...form,
        name,
        slug,
        description: form.description?.trim() || null,
        icon: form.icon?.trim() || null,
        icon_url: form.icon_url?.trim() || null,
        cover_url: form.cover_url?.trim() || null,
      };
      const saved = subjectId ? await updateSubject(subjectId, payload) : await createSubject(payload);
      subjectDraft.clearDraft();
      navigate(`/admin/subjects/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la matière.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!subjectId) return;
    if (!(await checkSubjectCanDelete(subjectId))) {
      setError('Impossible de supprimer cette matière car elle est utilisée par des cours ou des questions. Masquez-la ou dépubliez-la à la place.');
      return;
    }
    try {
      await manageSubject(subjectId, 'delete');
      navigate('/admin/subjects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer cette matière.');
    }
  };

  if (loading) return <LoadingSpinner label="Chargement de la matière" />;

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <BackButton label="Retour aux matières" fallbackTo="/admin/subjects" />
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Administration</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">{editing ? 'Modifier la matière' : 'Ajouter une matière'}</h1>
      </header>
      {subjectDraft.restored ? <DraftRestoreBanner onKeep={subjectDraft.dismissRestoreBanner} onDiscard={subjectDraft.discardDraft} /> : null}
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la matière" value={form.name} onChange={changeName} required />
          <Field label="Slug" value={form.slug} onChange={(value) => { setSlugEdited(true); setField('slug', value); }} required />
          <TextArea label="Description" value={form.description ?? ''} onChange={(value) => setField('description', value)} className="sm:col-span-2" />
          <Field label="Icône (texte ou emoji)" value={form.icon ?? ''} onChange={(value) => setField('icon', value)} />
          <Field label="URL de l’icône" value={form.icon_url ?? ''} onChange={(value) => setField('icon_url', value)} />
          <Field label="URL de l’image de couverture" value={form.cover_url ?? ''} onChange={(value) => setField('cover_url', value)} className="sm:col-span-2" />
          <label className="text-sm font-bold text-brand-navy">
            Couleur
            <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-brand-border px-3">
              <input type="color" value={form.color ?? '#FF8A00'} onChange={(event) => setField('color', event.target.value)} className="h-8 w-10 bg-transparent" />
              <input value={form.color ?? ''} onChange={(event) => setField('color', event.target.value)} className="min-w-0 flex-1 outline-none" />
            </div>
          </label>
          <label className="text-sm font-bold text-brand-navy">
            Ordre d’affichage
            <input type="number" value={form.subject_order} onChange={(event) => setField('subject_order', Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 outline-none focus:border-brand-orange" />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 p-4">
          <Toggle label="Publiée" checked={form.is_published} onChange={(value) => setField('is_published', value)} />
          <Toggle label="Mise en avant" checked={Boolean(form.is_featured)} onChange={(value) => setField('is_featured', value)} />
        </div>
        <div className="flex flex-wrap gap-3">
          <button disabled={saving} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          <button type="button" onClick={() => navigate('/admin/subjects')} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy">Annuler</button>
          {editing ? <button type="button" onClick={() => setDeleteOpen(true)} className="rounded-xl border border-red-100 px-5 py-3 text-sm font-bold text-red-700">Supprimer</button> : null}
        </div>
        <DraftStatus status={subjectDraft.status} lastSavedAt={subjectDraft.lastSavedAt} />
      </form>
      <ActionDialog open={deleteOpen} title="Supprimer définitivement cette matière ?" message="Cette action ne peut pas être annulée." confirmLabel="Supprimer" danger busy={saving} onClose={() => setDeleteOpen(false)} onConfirm={() => void remove()} />
    </section>
  );
}

function Field({ label, value, onChange, required, className = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; className?: string }) {
  return <label className={`text-sm font-bold text-brand-navy ${className}`}>{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 font-normal outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" /></label>;
}
function TextArea({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`text-sm font-bold text-brand-navy ${className}`}>{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-border p-4 font-normal outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" /></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-orange" />{label}</label>;
}
