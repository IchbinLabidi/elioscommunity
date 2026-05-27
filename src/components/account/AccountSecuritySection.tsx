import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { logSupabaseError } from '../../lib/debug';
import { supabase } from '../../lib/supabase';
import { updateCurrentUserEmailDirect } from '../../services/accountSecurityService';

type AccountSecuritySectionProps = {
  className?: string;
  compact?: boolean;
};

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('password')) return 'Impossible de mettre à jour le mot de passe.';
  return 'Une erreur est survenue. Veuillez réessayer.';
}

function friendlyEmailError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Impossible de modifier l’adresse email.';
}

export default function AccountSecuritySection({ className = '', compact = false }: AccountSecuritySectionProps) {
  const { user, profile, refreshProfile } = useAuth();
  const authEmail = user?.email ?? profile?.email ?? '';
  const [displayEmail, setDisplayEmail] = useState(authEmail);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => setDisplayEmail(authEmail), [authEmail]);

  const updateEmail = async (event: FormEvent) => {
    event.preventDefault();
    setEmailNotice('');
    setEmailError('');
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || !confirmEmail.trim()) return setEmailError('Veuillez saisir et confirmer votre nouvelle adresse email.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return setEmailError('Veuillez saisir une adresse email valide.');
    if (nextEmail !== confirmEmail.trim().toLowerCase()) return setEmailError('Les adresses email ne correspondent pas.');
    if (nextEmail === displayEmail.toLowerCase()) return setEmailError('La nouvelle adresse doit être différente de votre adresse actuelle.');
    setEmailBusy(true);
    try {
      const changedEmail = await updateCurrentUserEmailDirect(nextEmail);
      setDisplayEmail(changedEmail);
      setEmail('');
      setConfirmEmail('');
      setEmailNotice('Votre adresse email a été mise à jour.');
      try {
        await refreshProfile();
      } catch (refreshError) {
        logSupabaseError('account.refreshProfileAfterEmail', refreshError);
      }
    } catch (error) {
      const details = error as { message?: string; status?: number; name?: string };
      if (import.meta.env.DEV) {
        console.error('Email update failed', {
          message: details?.message,
          status: details?.status,
          name: details?.name,
          error,
        });
      }
      setEmailError(friendlyEmailError(error));
    } finally {
      setEmailBusy(false);
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordNotice('');
    setPasswordError('');
    if (password.length < 8) return setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirmPassword) return setPasswordError('Les mots de passe ne correspondent pas.');
    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      setPasswordNotice('Votre mot de passe a été mis à jour.');
    } catch (error) {
      logSupabaseError('account.updatePassword', error);
      setPasswordError(friendlyAuthError(error));
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <section className={`space-y-5 ${className}`}>
      <div>
        <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-black text-brand-navy`}>Sécurité du compte</h2>
        <p className="mt-1 text-sm text-slate-500">Gérez votre email de connexion et votre mot de passe.</p>
      </div>
      <div className={`grid gap-5 ${compact ? '' : 'lg:grid-cols-2'}`}>
        <form onSubmit={updateEmail} className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-brand-navy">Modifier l'adresse email</h3>
          {emailNotice ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{emailNotice}</p> : null}
          {emailError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{emailError}</p> : null}
          <label className="mt-5 block text-sm font-bold text-brand-navy">
            Email actuel
            <input value={displayEmail} readOnly className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-slate-50 px-4 text-sm text-slate-500" />
          </label>
          <label className="mt-4 block text-sm font-bold text-brand-navy">
            Nouvel email
            <input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailNotice(''); }} placeholder="votre@email.com" className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-50" />
          </label>
          <label className="mt-4 block text-sm font-bold text-brand-navy">
            Confirmer le nouvel email
            <input type="email" autoComplete="email" value={confirmEmail} onChange={(event) => { setConfirmEmail(event.target.value); setEmailNotice(''); }} placeholder="Confirmez votre email" className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-50" />
          </label>
          <p className="mt-4 text-xs leading-5 text-slate-500">Votre nouvelle adresse est appliquée immédiatement à votre compte connecté.</p>
          <button type="submit" disabled={emailBusy} className="mt-5 w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-navyDark disabled:cursor-not-allowed disabled:opacity-60">
            {emailBusy ? 'Mise à jour...' : emailNotice ? 'Email mis à jour' : "Mettre à jour l'email"}
          </button>
        </form>

        <form onSubmit={updatePassword} className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-brand-navy">Modifier le mot de passe</h3>
          {passwordNotice ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{passwordNotice}</p> : null}
          {passwordError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{passwordError}</p> : null}
          <label className="mt-5 block text-sm font-bold text-brand-navy">
            Nouveau mot de passe
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Au moins 8 caractères" className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-50" />
          </label>
          <label className="mt-4 block text-sm font-bold text-brand-navy">
            Confirmer le mot de passe
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirmez votre mot de passe" className="mt-2 h-12 w-full rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-50" />
          </label>
          <p className="mt-4 text-xs text-slate-500">Utilisez au minimum 8 caractères pour sécuriser votre compte.</p>
          <button type="submit" disabled={passwordBusy} className="mt-5 w-full rounded-xl bg-brand-orange px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-orangeHover disabled:cursor-not-allowed disabled:opacity-60">
            {passwordBusy ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </section>
  );
}
