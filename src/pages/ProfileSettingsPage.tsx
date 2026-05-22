import { FormEvent, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, uploadPublicFile } from '../lib/supabase';

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [specialty, setSpecialty] = useState(profile?.specialty ?? '');
  const [experience, setExperience] = useState(profile?.experience ?? '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    const avatarUrl = avatar ? await uploadPublicFile('avatars', avatar, profile.id) : profile.avatar_url;
    const { error } = await supabase.from('profiles').update({ full_name: fullName, bio, specialty, experience, avatar_url: avatarUrl }).eq('id', profile.id);
    setMessage(error ? error.message : 'Profile updated.');
    if (!error) refreshProfile();
  };

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-elios-navy">Profile settings</h1>
      <form onSubmit={submit} className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {message ? <p className="mb-4 rounded-lg bg-elios-sky p-3 text-sm text-elios-blue">{message}</p> : null}
        <label className="block text-sm font-semibold text-elios-navy">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">Specialty<input value={specialty} onChange={(event) => setSpecialty(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">Experience<textarea value={experience} onChange={(event) => setExperience(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">Profile picture<input type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm" /></label>
        <button className="mt-6 rounded-lg bg-elios-navy px-5 py-3 font-bold text-white">Save profile</button>
      </form>
    </section>
  );
}
