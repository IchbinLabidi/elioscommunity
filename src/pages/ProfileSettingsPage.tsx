import { FormEvent, useState } from 'react';
import AccountSecuritySection from '../components/account/AccountSecuritySection';
import DraftRestoreBanner from '../components/forms/DraftRestoreBanner';
import DraftStatus from '../components/forms/DraftStatus';
import BackButton from '../components/navigation/BackButton';
import AvatarUpload from '../components/AvatarUpload';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import useUploadWithProgress from '../hooks/useUploadWithProgress';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../services/uploadService';

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [specialty, setSpecialty] = useState(profile?.specialty ?? '');
  const [experience, setExperience] = useState(profile?.experience ?? '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const avatarUpload = useUploadWithProgress();
  const profileDraft = useFormDraft({
    key: draftKey(profile?.id, 'student:profile'),
    values: { fullName, bio, specialty, experience },
    onRestore: (values) => {
      setFullName(values.fullName);
      setBio(values.bio);
      setSpecialty(values.specialty);
      setExperience(values.experience);
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    const avatarUrl = avatar ? await avatarUpload.uploadFile((options) => uploadAvatar(avatar, profile.id, options)) : profile.avatar_url;
    const { error } = await supabase.from('profiles').update({ full_name: fullName, bio, specialty, experience, avatar_url: avatarUrl }).eq('id', profile.id);
    setMessage(error ? error.message : 'Profil mis à jour.');
    if (!error) {
      profileDraft.clearDraft();
      refreshProfile();
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <BackButton label="Retour au tableau de bord" fallbackTo="/student/dashboard" />
      <header>
        <h1 className="text-3xl font-black text-brand-navy">Mon profil</h1>
        <p className="mt-2 text-slate-600">Gérez vos informations personnelles et la sécurité de votre compte.</p>
      </header>
      {profileDraft.restored ? <DraftRestoreBanner fileReminder="Veuillez sélectionner à nouveau votre photo si nécessaire." onKeep={profileDraft.dismissRestoreBanner} onDiscard={profileDraft.discardDraft} /> : null}
      <form onSubmit={submit} className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-black text-brand-navy">Informations personnelles</h2>
        {message ? <p className="mb-4 rounded-xl bg-elios-sky p-3 text-sm text-elios-blue">{message}</p> : null}
        <label className="block text-sm font-semibold text-brand-navy">Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-border px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-brand-navy">Domaine d'intérêt<input value={specialty} onChange={(event) => setSpecialty(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-border px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-brand-navy">Présentation<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-brand-border px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-brand-navy">Parcours<textarea value={experience} onChange={(event) => setExperience(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border px-3 py-3" /></label>
        <div className="mt-4"><AvatarUpload previewUrl={profile?.avatar_url} file={avatar} onChange={(file) => { setAvatar(file); avatarUpload.resetUpload(); }} progress={avatarUpload} onCancel={avatarUpload.cancelUpload} /></div>
        <button className="mt-6 rounded-xl bg-brand-navy px-5 py-3 font-bold text-white">Enregistrer le profil</button>
        <div className="mt-4"><DraftStatus status={profileDraft.status} lastSavedAt={profileDraft.lastSavedAt} /></div>
      </form>
      <AccountSecuritySection />
    </section>
  );
}
