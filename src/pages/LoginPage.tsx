import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole, isValidEmail } from '../lib/auth';

export default function LoginPage() {
  const { signIn, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const routeError = (location.state as { error?: string } | null)?.error;
  const redirectPath = new URLSearchParams(location.search).get('redirect');

  useEffect(() => {
    if (!authLoading && profile) {
      navigate(redirectPath || dashboardPathForRole(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile, redirectPath]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    if (!isValidEmail(email)) {
      setError('Veuillez saisir une adresse email valide.');
      setSubmitting(false);
      return;
    }
    if (!password) {
      setError('Le mot de passe est requis.');
      setSubmitting(false);
      return;
    }
    try {
      const signedInProfile = await signIn(email, password);
      const from = redirectPath || (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      if (!signedInProfile) {
        navigate('/complete-profile', { replace: true });
        return;
      }
      navigate(from || dashboardPathForRole(signedInProfile.role || profile?.role || 'student'), { replace: true });
    } catch {
      setError('Email ou mot de passe incorrect.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={submit} className="mt-2">
        <h1 className="mt-5 text-3xl font-black tracking-tight text-brand-navy lg:mt-8">Connexion</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Accedez a votre espace etudiant ou professeur.</p>
        {routeError || error ? (
          <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error || routeError}
          </p>
        ) : null}

        <label className="mt-6 block text-sm font-bold text-brand-navy">
          Email
          <input
            className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
            type="email"
            autoComplete="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-brand-navy">
          Mot de passe
          <input
            className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
            type="password"
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button
          disabled={submitting}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#082B66] px-4 font-bold text-white transition hover:bg-[#061B3D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="mt-6 text-center text-sm text-slate-600">
          Nouveau ici ?{' '}
          <Link
            to={redirectPath ? `/register?redirect=${encodeURIComponent(redirectPath)}` : '/register'}
            className="font-bold text-brand-navy transition hover:text-brand-orange hover:underline"
          >
            Creer un compte
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
