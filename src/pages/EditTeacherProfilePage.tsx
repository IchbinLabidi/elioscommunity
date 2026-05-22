import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarUpload from '../components/AvatarUpload';
import SubjectSelect from '../components/SubjectSelect';
import { useAuth } from '../contexts/AuthContext';
import { updateTeacherProfile } from '../services/teachersService';
import { uploadAvatar, validateImageFile } from '../services/uploadService';

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function validUrl(value: string) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default function EditTeacherProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    headline: profile?.headline ?? '',
    specialty: profile?.specialty ?? '',
    subjects: profile?.subjects ?? [],
    bio: profile?.bio ?? '',
    experience: profile?.experience ?? '',
    education: profile?.education ?? '',
    languages: profile?.languages?.join(', ') ?? '',
    location: profile?.location ?? '',
    phone: profile?.phone ?? '',
    whatsapp: profile?.whatsapp ?? '',
    website_url: profile?.website_url ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
    facebook_url: profile?.facebook_url ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const previewUrl = useMemo(() => avatar ? URL.createObjectURL(avatar) : profile?.avatar_url, [avatar, profile?.avatar_url]);

  const setField = (key: keyof typeof form, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    if (!form.full_name.trim()) return setError('Full name is required.');
    if (!form.specialty.trim()) return setError('Specialty is required.');
    if (form.bio.length > 1500) return setError('Bio must be 1500 characters or less.');
    if (![form.website_url, form.linkedin_url, form.facebook_url].every(validUrl)) return setError('Please enter valid URLs.');
    if (avatar) {
      const validation = validateImageFile(avatar);
      if (validation) return setError(validation);
    }

    setSaving(true);
    setError('');
    try {
      const avatarUrl = avatar ? await uploadAvatar(avatar, profile.id) : profile.avatar_url;
      await updateTeacherProfile({
        id: profile.id,
        full_name: form.full_name.trim(),
        headline: form.headline.trim() || null,
        specialty: form.specialty.trim(),
        subjects: form.subjects,
        bio: form.bio.trim() || null,
        experience: form.experience.trim() || null,
        education: form.education.trim() || null,
        languages: splitList(form.languages),
        location: form.location.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        website_url: form.website_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        avatar_url: avatarUrl,
      });
      await refreshProfile();
      navigate(`/teachers/${profile.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-elios-navy">Edit teacher profile</h1>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <AvatarUpload previewUrl={previewUrl} onChange={setAvatar} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-elios-navy">Full name<input value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="text-sm font-semibold text-elios-navy">Specialty<input value={form.specialty} onChange={(e) => setField('specialty', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        </div>
        <label className="block text-sm font-semibold text-elios-navy">Headline<input value={form.headline} onChange={(e) => setField('headline', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="block text-sm font-semibold text-elios-navy">Subjects<SubjectSelect multiple value={form.subjects} onChange={(value) => setField('subjects', value)} /></label>
        <label className="block text-sm font-semibold text-elios-navy">Bio<textarea rows={5} value={form.bio} onChange={(e) => setField('bio', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-elios-navy">Experience<textarea rows={4} value={form.experience} onChange={(e) => setField('experience', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="text-sm font-semibold text-elios-navy">Education<textarea rows={4} value={form.education} onChange={(e) => setField('education', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-elios-navy">Languages<input value={form.languages} onChange={(e) => setField('languages', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="text-sm font-semibold text-elios-navy">Location<input value={form.location} onChange={(e) => setField('location', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="text-sm font-semibold text-elios-navy">WhatsApp<input value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-elios-navy">Website<input value={form.website_url} onChange={(e) => setField('website_url', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="text-sm font-semibold text-elios-navy">LinkedIn<input value={form.linkedin_url} onChange={(e) => setField('linkedin_url', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
          <label className="text-sm font-semibold text-elios-navy">Facebook<input value={form.facebook_url} onChange={(e) => setField('facebook_url', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        </div>
        <button disabled={saving} className="rounded-lg bg-elios-navy px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save profile'}</button>
      </form>
    </section>
  );
}
