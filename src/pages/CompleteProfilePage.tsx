import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole } from '../lib/auth';
import { getErrorMessage, logSupabaseError } from '../lib/debug';
import { UserRole } from '../types/database';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DraftRestoreBanner from '../components/forms/DraftRestoreBanner';
import DraftStatus from '../components/forms/DraftStatus';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';

export default function CompleteProfilePage() {
  const { user, profile, loading: authLoading, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>(
    user?.user_metadata?.role === 'teacher' ? 'teacher' : 'student',
  );
  const [specialty, setSpecialty] = useState(user?.user_metadata?.specialty || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const profileDraft = useFormDraft({
    key: draftKey(user?.id, 'profile:complete'),
    values: { fullName, role, specialty },
    onRestore: (values) => {
      setFullName(values.fullName);
      setRole(values.role);
      setSpecialty(values.specialty);
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
    if (!authLoading && profile) {
      navigate(dashboardPathForRole(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (role === 'teacher' && !specialty.trim()) {
      setError('Specialty is required for teachers.');
      return;
    }

    setSaving(true);
    try {
      const createdProfile = await completeProfile({
        fullName: fullName.trim(),
        role,
        specialty: specialty.trim(),
      });
      profileDraft.clearDraft();
      navigate(dashboardPathForRole(createdProfile.role), { replace: true });
    } catch (err) {
      logSupabaseError('profile.recovery', err);
      setError(getErrorMessage(err, 'Unable to complete profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <LoadingSpinner fullPage label="Checking your account" />;

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-elios-navy">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-600">Your login works. We just need your sosprof.tn role to finish setup.</p>
        {profileDraft.restored ? <div className="mt-4"><DraftRestoreBanner onKeep={profileDraft.dismissRestoreBanner} onDiscard={profileDraft.discardDraft} /></div> : null}
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(['student', 'teacher'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-lg border px-4 py-3 text-sm font-bold capitalize ${role === option ? 'border-elios-yellow bg-yellow-50 text-elios-navy' : 'border-slate-200 text-slate-600'}`}
            >
              {option}
            </button>
          ))}
        </div>
        <label className="mt-5 block text-sm font-semibold text-elios-navy">
          Full name
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </label>
        {role === 'teacher' ? (
          <label className="mt-4 block text-sm font-semibold text-elios-navy">
            Specialty
            <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" value={specialty} onChange={(event) => setSpecialty(event.target.value)} required />
          </label>
        ) : null}
        <button disabled={saving} className="mt-6 w-full rounded-lg bg-elios-navy px-4 py-3 font-bold text-white disabled:opacity-60">
          {saving ? 'Saving profile...' : 'Continue'}
        </button>
        <div className="mt-3"><DraftStatus status={profileDraft.status} lastSavedAt={profileDraft.lastSavedAt} /></div>
      </form>
    </main>
  );
}
